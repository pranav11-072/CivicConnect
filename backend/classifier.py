from nlp_engine import analyze, ensure_trained


class GrievanceClassifier:
    def __init__(self):
        self.metrics = ensure_trained()

    def predict(self, title: str, description: str) -> dict:
        return analyze(title, description)


classifier = GrievanceClassifier()
