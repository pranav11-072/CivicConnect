import re

try:
    import nltk
    from nltk.corpus import stopwords
    _HAS_NLTK = True
except ImportError:
    _HAS_NLTK = False

KANNADA_UNICODE_RE = re.compile(r"[\u0C80-\u0CFF]")

KANGLISH_MAP = {
    # Water Supply
    "neeru": "water",
    "niru": "water",
    "kudiyuva": "drinking",
    "nala": "tap",
    "pipe": "pipeline",
    "odedu": "burst",
    "borewell": "borewell",
    "barthilla": "not coming",
    "barutilla": "not coming",
    "bandilla": "not arrived",
    "kammi": "low",
    "kolaku": "dirty",
    "vasane": "smell",
    "tankalli": "tank",
    # Electricity
    "current": "electricity power",
    "vidyut": "electricity power",
    "kambha": "electric pole",
    "kamba": "electric pole",
    "deepa": "light",
    "hogthide": "outage cut",
    "uriyuthilla": "not working",
    "tanti": "wire",
    "benki": "spark fire",
    "kidi": "spark",
    "raatri": "night",
    # Roads and Infrastructure
    "raste": "road",
    "roady": "road",
    "roadu": "road",
    "gundi": "pothole",
    "gundigalu": "potholes",
    "doddha": "big",
    "hodedu": "broken",
    "kusidu": "collapsed",
    "nadeyakke": "walking",
    "sari": "proper",
    "kittu": "damaged",
    "biddide": "fallen",
    # Sanitation and Waste Management
    "kasa": "garbage waste",
    "charandi": "drainage sewage",
    "mori": "drain",
    "kolache": "sewage dirty",
    "swachha": "clean",
    "durvasane": "foul smell",
    "solle": "mosquito",
    "totti": "dustbin",
    "haktidare": "dumping",
    # Kanglish modifiers & Kannada stems
    "namma": "our",
    "dalli": "in",
    "alli": "in",
    "hatra": "near",
    "pakka": "near",
    "mele": "on",
    "munde": "front",
    "inda": "from",
    "dina": "days",
    "dinadinda": "since days",
    "ide": "is",
    "illa": "no not",
    "agthide": "happening",
    "agide": "became",
    "agbeku": "needs",
    "madi": "please do",
    "madsi": "please clean",
    "madilla": "not done",
    "kelasa": "work",
    "madthilla": "not working",
    "tumbha": "very much",
    "tumba": "very much",
    "kashta": "difficulty",
    "beega": "urgent",
    "bega": "urgent",
    "nintide": "stagnant",
}

KANGLISH_INDICATORS = {
    "neeru", "niru", "kasa", "raste", "gundi", "charandi", "mori", "kambha",
    "namma", "dalli", "barthilla", "hogthide", "agthide", "madthilla", "illa",
    "madi", "dinadinda", "beega", "tumbha", "hatra", "pakka", "kolache", "vidyut",
    "odedu", "bandilla", "nintide", "madilla", "doddha", "biddide",
}

KANNADA_STOPWORDS = {
    "ಮತ್ತು", "ಅಥವಾ", "ಈ", "ಆ", "ಒಂದು", "ಇದು", "ಅದು", "ನಮ್ಮ", "ನಾನು", "ನಾವು",
    "ಇಲ್ಲಿ", "ಅಲ್ಲಿ", "ಮೇಲೆ", "ಕೆಳಗೆ", "ಹಾಗೂ", "ಆದರೆ", "ಏಕೆಂದರೆ", "ದಯವಿಟ್ಟು", "ಆಗಿದೆ",
}

KANGLISH_STOPWORDS = {
    "namma", "dalli", "alli", "ide", "agide", "agthide", "madi", "mele",
    "hatra", "pakka", "inda", "idu", "adu", "ondu", "please",
}

DEFAULT_EN_STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "in", "on", "at", "for", "to", "of", "and", "or", "with", "this", "that",
    "our", "we", "they", "it", "its", "by", "from", "as", "has", "have", "had",
}

if _HAS_NLTK:
    try:
        EN_STOPWORDS = set(stopwords.words("english")) - {"no", "not", "nor", "never", "off"}
    except Exception:
        EN_STOPWORDS = DEFAULT_EN_STOPWORDS
else:
    EN_STOPWORDS = DEFAULT_EN_STOPWORDS

ALL_STOPWORDS = EN_STOPWORDS | KANNADA_STOPWORDS | KANGLISH_STOPWORDS

HIGH_URGENCY_TERMS = {
    "urgent", "emergency", "immediately", "accident", "accidents", "spark", "sparking",
    "fire", "live wire", "electrocution", "shock", "collapse", "collapsed", "burst",
    "flood", "flooding", "hospital", "school", "sewage entering", "danger", "dangerous",
    "hazard", "no water", "three days", "five days", "weeks", "dead animal", "manhole",
    "ತುರ್ತು", "ಅಪಘಾತ", "ಬೆಂಕಿ", "ಕಿಡಿ", "ಅಪಾಯ", "ಒಡೆದು", "ಕುಸಿದು", "ಸಂಪೂರ್ಣ ಸ್ಥಗಿತ",
    "ಮ್ಯಾನ್ಹೋಲ್", "ಅಪಾಯಕಾರಿ",
    "bega", "beega", "odedu", "kusidu", "accident", "spark",
}

MEDIUM_URGENCY_TERMS = {
    "broken", "damaged", "blocked", "overflowing", "dirty", "smell", "pothole", "potholes",
    "outage", "low pressure", "mosquito", "mosquitoes", "not working", "not collected",
    "leaking", "dustbin", "fluctuation", "darkness",
    "ಕೊಳಕು", "ದುರ್ವಾಸನೆ", "ಗುಂಡಿ", "ಕಡಿತ", "ಕೆಟ್ಟು", "ಸಮಸ್ಯೆ", "ತೊಂದರೆ", "ಸೋರಿಕೆ",
    "gundi", "kolaku", "vasane", "kammi", "madthilla", "barthilla", "hogthide",
}

NEGATIVE_TERMS = {
    "no", "not", "never", "dirty", "muddy", "foul", "smell", "odor", "broken", "damaged",
    "burst", "overflowing", "blocked", "danger", "dangerous", "hazard", "problem",
    "issue", "worst", "pathetic", "accident", "spark", "dark", "darkness", "delay", "failed",
    "collapsed", "stinking", "mosquito", "waste", "stuck", "leaking", "choked", "unusable",
    "missing", "contaminated", "fused", "hanging", "flooding",
    "ಇಲ್ಲ", "ಬರುತ್ತಿಲ್ಲ", "ಕೊಳಕು", "ದುರ್ವಾಸನೆ", "ಒಡೆದು", "ಅಪಘಾತ", "ಅಪಾಯ", "ಸಮಸ್ಯೆ", "ತೊಂದರೆ", "ಕೆಟ್ಟು",
    "illa", "barthilla", "madthilla", "hogthide", "kashta", "danger", "problem", "bad", "bandilla", "madilla",
}

POSITIVE_TERMS = {
    "thank", "thanks", "good", "resolved", "clean", "appreciate", "helpful", "fast",
    "ಧನ್ಯವಾದ", "ಉತ್ತಮ", "ಚೆನ್ನಾಗಿದೆ", "ಸರಿಪಡಿಸಲಾಗಿದೆ",
}


def detect_language(text: str) -> str:
    has_kannada = bool(KANNADA_UNICODE_RE.search(text))
    ascii_tokens = set(re.findall(r"[a-zA-Z]+", text.lower()))
    has_kanglish = len(ascii_tokens & KANGLISH_INDICATORS) > 0
    has_english = len(ascii_tokens) > 0

    if has_kannada and has_english:
        return "Kannada-English"
    if has_kannada:
        return "Kannada"
    if has_kanglish:
        return "Kanglish"
    return "English"


KANNADA_STEM_MAP = {
    "ನೀರು": "water",
    "ನೀರಿನ": "water",
    "ನಳದಲ್ಲಿ": "tap water",
    "ಪೈಪ್": "pipeline",
    "ಬೋರ್ವೆಲ್": "borewell water",
    "ವಿದ್ಯುತ್": "electricity power",
    "ಕಂಬ": "electric pole",
    "ದೀಪ": "street light",
    "ಟ್ರಾನ್ಸ್ಫಾರ್ಮರ್": "transformer electricity",
    "ತಂತಿ": "wire electricity",
    "ರಸ್ತೆ": "road",
    "ರಸ್ತೆಯಲ್ಲಿ": "road",
    "ರಸ್ತೆಯ": "road",
    "ಗುಂಡಿ": "pothole road",
    "ಗುಂಡಿಗಳು": "potholes road",
    "ಪಾದಚಾರಿ": "footpath road",
    "ಮ್ಯಾನ್ಹೋಲ್": "manhole road",
    "ಕಸ": "garbage waste",
    "ಕಸದ": "garbage dustbin",
    "ಚರಂಡಿ": "drainage sewage",
    "ಮೋರಿ": "drain sewage",
    "ಕೊಳಚೆ": "sewage dirty",
    "ಶೌಚಾಲಯ": "toilet sanitation",
    "ಸೊಳ್ಳೆ": "mosquito",
}


def clean_and_normalize(text: str) -> str:
    lowered = text.strip().lower()
    cleaned = re.sub(r"[^\u0C80-\u0CFFa-z0-9\s]", " ", lowered)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    raw_tokens = cleaned.split()
    normalized = []
    for tok in raw_tokens:
        if tok in KANGLISH_MAP:
            normalized.append(tok)
            normalized.extend(KANGLISH_MAP[tok].split())
        else:
            normalized.append(tok)
            for stem, eng in KANNADA_STEM_MAP.items():
                if stem in tok:
                    normalized.extend(eng.split())

    filtered = [t for t in normalized if t not in ALL_STOPWORDS and len(t) > 1]
    return " ".join(filtered)


def tokenize_text(text: str) -> list:
    normalized = clean_and_normalize(text)
    if _HAS_NLTK:
        try:
            tokens = nltk.word_tokenize(normalized)
            return [t for t in tokens if t not in ALL_STOPWORDS and len(t) > 1]
        except Exception:
            pass
    return re.findall(r"[\u0C80-\u0CFF]+|[a-z0-9]+", normalized)


def analyze_sentiment(text: str) -> str:
    lowered = text.lower()
    tokens = set(re.findall(r"[\u0C80-\u0CFFa-z]+", lowered))
    neg_hits = sum(1 for term in NEGATIVE_TERMS if term in tokens or term in lowered)
    pos_hits = sum(1 for term in POSITIVE_TERMS if term in tokens or term in lowered)
    if neg_hits > pos_hits:
        return "Negative"
    if pos_hits > neg_hits:
        return "Positive"
    return "Neutral"


def detect_urgency(text: str) -> str:
    lowered = text.lower()
    if any(term in lowered for term in HIGH_URGENCY_TERMS):
        return "High"
    if any(term in lowered for term in MEDIUM_URGENCY_TERMS):
        return "Medium"
    return "Low"
