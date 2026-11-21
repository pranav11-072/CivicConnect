import os
from flask import Flask, jsonify, request
from flask_cors import CORS

from classifier import classifier
from database import init_db
from response_generator import generate_bilingual_response


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")}})
    init_db()

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "model": classifier.metrics.get("selected_model")})

    @app.route("/api/nlp/analyze", methods=["POST"])
    def analyze_endpoint():
        data = request.get_json(silent=True) or {}
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        if not title and not description:
            return jsonify({"error": "Title or description is required."}), 400
        nlp_result = classifier.predict(title, description)
        bilingual = generate_bilingual_response(
            category=nlp_result["predicted_category"],
            urgency=nlp_result["urgency"],
            status="Pending",
            language=nlp_result["detected_language"],
        )
        return jsonify({"nlp": nlp_result, "responses": bilingual})

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=int(os.getenv("FLASK_PORT", "5000")), debug=False)
