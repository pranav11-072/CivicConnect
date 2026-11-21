import argparse
import csv
import json
import math
import os
import random
import re
import sys
from collections import Counter, defaultdict

from nlp_pipeline import (
    analyze_sentiment,
    clean_and_normalize,
    detect_language,
    detect_urgency,
    tokenize_text,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "data", "grievances_dataset.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_JSON = os.path.join(MODEL_DIR, "trained_model.json")
METRICS_JSON = os.path.join(MODEL_DIR, "model_metrics.json")
LOW_CONFIDENCE_THRESHOLD = 0.55


def extract_ngrams(text: str) -> list:
    tokens = tokenize_text(text)
    features = list(tokens)
    for i in range(len(tokens) - 1):
        features.append(f"{tokens[i]}_{tokens[i + 1]}")
    # Add character 3-grams for Kannada Unicode script resilience across inflections
    for tok in tokens:
        if re.search(r"[\u0C80-\u0CFF]", tok) and len(tok) >= 3:
            for j in range(len(tok) - 2):
                features.append(f"c3:{tok[j:j+3]}")
    return features


def build_tfidf(docs_tokens: list, vocab: dict = None, idf: dict = None):
    if vocab is None or idf is None:
        df_counts = Counter()
        for toks in docs_tokens:
            for t in set(toks):
                df_counts[t] += 1
        n_docs = len(docs_tokens)
        vocab = {term: idx for idx, term in enumerate(sorted(df_counts.keys()))}
        idf = {
            term: math.log((1.0 + n_docs) / (1.0 + df)) + 1.0
            for term, df in df_counts.items()
        }

    vectors = []
    for toks in docs_tokens:
        tf = Counter(toks)
        vec = {}
        norm_sq = 0.0
        for term, cnt in tf.items():
            if term in vocab:
                w = (1.0 + math.log(cnt)) * idf[term]
                vec[vocab[term]] = w
                norm_sq += w * w
        norm = math.sqrt(norm_sq) or 1.0
        for k in vec:
            vec[k] /= norm
        vectors.append(vec)
    return vectors, vocab, idf


def softmax(logits: list) -> list:
    m = max(logits)
    exps = [math.exp(x - m) for x in logits]
    s = sum(exps) or 1.0
    return [e / s for e in exps]


def train_multinomial_nb(X: list, y: list, classes: list, vocab_size: int, alpha: float = 0.5):
    class_counts = Counter(y)
    total = len(y)
    log_priors = {c: math.log(class_counts[c] / total) for c in classes}
    feature_sums = {c: [0.0] * vocab_size for c in classes}
    total_weights = {c: 0.0 for c in classes}

    for vec, label in zip(X, y):
        for idx, val in vec.items():
            feature_sums[label][idx] += val
            total_weights[label] += val

    log_likelihoods = {}
    for c in classes:
        denom = total_weights[c] + alpha * vocab_size
        log_likelihoods[c] = [
            math.log((feature_sums[c][i] + alpha) / denom) for i in range(vocab_size)
        ]

    return {"type": "MultinomialNB", "classes": classes, "log_priors": log_priors, "log_likelihoods": log_likelihoods}


def predict_nb_proba(model: dict, vec: dict) -> dict:
    classes = model["classes"]
    logits = []
    for c in classes:
        score = model["log_priors"][c]
        ll = model["log_likelihoods"][c]
        for idx, val in vec.items():
            if idx < len(ll):
                score += val * ll[idx]
        logits.append(score)
    probs = softmax(logits)
    return {c: probs[i] for i, c in enumerate(classes)}


def train_logistic_regression(X: list, y: list, classes: list, vocab_size: int, lr: float = 3.0, reg: float = 1e-4, epochs: int = 240):
    c_to_idx = {c: i for i, c in enumerate(classes)}
    k = len(classes)
    weights = [[0.0] * vocab_size for _ in range(k)]
    biases = [0.0] * k
    n = len(X)

    for _ in range(epochs):
        grad_w = [[0.0] * vocab_size for _ in range(k)]
        grad_b = [0.0] * k
        for vec, label in zip(X, y):
            logits = []
            for ci in range(k):
                s = biases[ci]
                w_row = weights[ci]
                for idx, val in vec.items():
                    s += w_row[idx] * val
                logits.append(s)
            probs = softmax(logits)
            target = c_to_idx[label]
            for ci in range(k):
                err = probs[ci] - (1.0 if ci == target else 0.0)
                grad_b[ci] += err / n
                for idx, val in vec.items():
                    grad_w[ci][idx] += (err * val) / n

        for ci in range(k):
            biases[ci] -= lr * grad_b[ci]
            for j in range(vocab_size):
                weights[ci][j] -= lr * (grad_w[ci][j] + reg * weights[ci][j])

    return {"type": "LogisticRegression", "classes": classes, "weights": weights, "biases": biases}


def predict_linear_proba(model: dict, vec: dict, temperature: float = 1.0) -> dict:
    classes = model["classes"]
    logits = []
    for ci in range(len(classes)):
        s = model["biases"][ci]
        w_row = model["weights"][ci]
        for idx, val in vec.items():
            if idx < len(w_row):
                s += w_row[idx] * val
        logits.append(s * temperature)
    probs = softmax(logits)
    return {c: probs[i] for i, c in enumerate(classes)}


def train_linear_svm(X: list, y: list, classes: list, vocab_size: int, lr: float = 0.35, reg: float = 1e-3, epochs: int = 120):
    k = len(classes)
    weights = [[0.0] * vocab_size for _ in range(k)]
    biases = [0.0] * k
    n = len(X)

    for _ in range(epochs):
        for ci, cls_name in enumerate(classes):
            w_row = weights[ci]
            b = biases[ci]
            for vec, label in zip(X, y):
                yt = 1.0 if label == cls_name else -1.0
                margin = b + sum(w_row[idx] * val for idx, val in vec.items())
                if yt * margin < 1.0:
                    for idx, val in vec.items():
                        w_row[idx] = (1.0 - lr * reg) * w_row[idx] + lr * yt * val / n
                    b += lr * yt / n
                else:
                    for idx in vec.keys():
                        w_row[idx] *= (1.0 - lr * reg)
            biases[ci] = b

    return {"type": "LinearSVM", "classes": classes, "weights": weights, "biases": biases}


def compute_metrics(y_true: list, y_pred: list, classes: list) -> dict:
    correct = sum(1 for a, b in zip(y_true, y_pred) if a == b)
    accuracy = correct / len(y_true) if y_true else 0.0
    per_class = {}
    f1_list = []
    for c in classes:
        tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == c and yp == c)
        fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt != c and yp == c)
        fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == c and yp != c)
        prec = tp / (tp + fp) if (tp + fp) else 0.0
        rec = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) else 0.0
        support = sum(1 for yt in y_true if yt == c)
        per_class[c] = {
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "support": support,
        }
        f1_list.append(f1)

    macro_f1 = sum(f1_list) / len(f1_list) if f1_list else 0.0
    return {
        "accuracy": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "per_class": per_class,
    }


def stratified_split(rows: list, test_ratio: float = 0.25, seed: int = 42):
    rng = random.Random(seed)
    by_class = defaultdict(list)
    for r in rows:
        by_class[r["category"]].append(r)

    train_rows, test_rows = [], []
    for cat in sorted(by_class.keys()):
        items = list(by_class[cat])
        rng.shuffle(items)
        split_idx = max(1, int(len(items) * test_ratio))
        test_rows.extend(items[:split_idx])
        train_rows.extend(items[split_idx:])
    return train_rows, test_rows


def train_and_save():
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if r.get("text") and r.get("category")]

    classes = sorted({r["category"] for r in rows})
    train_rows, test_rows = stratified_split(rows, test_ratio=0.25, seed=42)

    train_tokens = [extract_ngrams(r["text"]) for r in train_rows]
    test_tokens = [extract_ngrams(r["text"]) for r in test_rows]
    y_train = [r["category"] for r in train_rows]
    y_test = [r["category"] for r in test_rows]

    X_train, vocab, idf = build_tfidf(train_tokens)
    X_test, _, _ = build_tfidf(test_tokens, vocab=vocab, idf=idf)
    vocab_size = len(vocab)

    candidates = {
        "Logistic Regression": train_logistic_regression(X_train, y_train, classes, vocab_size),
        "Multinomial Naive Bayes": train_multinomial_nb(X_train, y_train, classes, vocab_size),
        "Linear SVM": train_linear_svm(X_train, y_train, classes, vocab_size),
    }

    eval_summary = {}
    best_name = None
    best_f1 = -1.0

    for name, mdl in candidates.items():
        preds = []
        for vec in X_test:
            if mdl["type"] == "MultinomialNB":
                probs = predict_nb_proba(mdl, vec)
            else:
                probs = predict_linear_proba(mdl, vec, temperature=2.5 if mdl["type"] == "LinearSVM" else 1.0)
            preds.append(max(probs.items(), key=lambda kv: kv[1])[0])
        m = compute_metrics(y_test, preds, classes)
        eval_summary[name] = m
        if m["macro_f1"] > best_f1:
            best_f1 = m["macro_f1"]
            best_name = name

    # Retrain winning model architecture on 100% of dataset for production inference
    full_tokens = [extract_ngrams(r["text"]) for r in rows]
    y_full = [r["category"] for r in rows]
    X_full, full_vocab, full_idf = build_tfidf(full_tokens)
    full_vsize = len(full_vocab)

    if best_name == "Multinomial Naive Bayes":
        final_model = train_multinomial_nb(X_full, y_full, classes, full_vsize)
    elif best_name == "Linear SVM":
        final_model = train_linear_svm(X_full, y_full, classes, full_vsize)
    else:
        final_model = train_logistic_regression(X_full, y_full, classes, full_vsize)

    artifact = {
        "model_name": best_name,
        "vocab": full_vocab,
        "idf": full_idf,
        "model": final_model,
    }
    metrics = {
        "selected_model": best_name,
        "dataset_rows": len(rows),
        "train_rows": len(train_rows),
        "test_rows": len(test_rows),
        "source": "holdout_evaluation",
        "models": eval_summary,
    }

    with open(MODEL_JSON, "w", encoding="utf-8") as f:
        json.dump(artifact, f)
    with open(METRICS_JSON, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    return metrics


def ensure_trained():
    if not os.path.exists(MODEL_JSON) or not os.path.exists(METRICS_JSON):
        return train_and_save()
    with open(METRICS_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def analyze(title: str, description: str) -> dict:
    ensure_trained()
    with open(MODEL_JSON, "r", encoding="utf-8") as f:
        artifact = json.load(f)

    combined = f"{title} {description}".strip()
    detected_language = detect_language(combined)
    tokens = extract_ngrams(combined)
    vecs, _, _ = build_tfidf([tokens], vocab=artifact["vocab"], idf=artifact["idf"])
    vec = vecs[0]

    mdl = artifact["model"]
    if not vec:
        # No vocabulary overlap at all -> uniform low confidence -> guaranteed human review
        classes = mdl["classes"]
        uniform = round(1.0 / len(classes), 4)
        class_probs = {c: uniform for c in classes}
        predicted_category = classes[0]
        confidence = uniform
    else:
        if mdl["type"] == "MultinomialNB":
            class_probs = predict_nb_proba(mdl, vec)
        else:
            temp = 2.5 if mdl["type"] == "LinearSVM" else 1.5
            class_probs = predict_linear_proba(mdl, vec, temperature=temp)
        predicted_category, confidence = max(class_probs.items(), key=lambda kv: kv[1])
        class_probs = {k: round(float(v), 4) for k, v in class_probs.items()}
        confidence = round(float(confidence), 4)

    sentiment = analyze_sentiment(combined)
    urgency = detect_urgency(combined)
    needs_human_review = confidence < LOW_CONFIDENCE_THRESHOLD

    return {
        "predicted_category": predicted_category,
        "confidence": confidence,
        "needs_human_review": needs_human_review,
        "detected_language": detected_language,
        "sentiment": sentiment,
        "urgency": urgency,
        "class_probabilities": class_probs,
        "model_used": artifact["model_name"],
        "normalized_preview": clean_and_normalize(combined)[:160],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true")
    parser.add_argument("--ensure-trained", action="store_true")
    parser.add_argument("--analyze", action="store_true")
    args = parser.parse_args()

    if args.train:
        res = train_and_save()
        print(json.dumps(res))
    elif args.ensure_trained:
        res = ensure_trained()
        print(json.dumps(res))
    elif args.analyze:
        payload = json.loads(sys.stdin.read() or "{}")
        res = analyze(payload.get("title", ""), payload.get("description", ""))
        print(json.dumps(res, ensure_ascii=False))
