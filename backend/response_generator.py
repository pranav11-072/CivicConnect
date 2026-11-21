import argparse
import json
import sys

CATEGORY_LABELS_KN = {
    "Water Supply": "ನೀರು ಸರಬರಾಜು",
    "Electricity": "ವಿದ್ಯುತ್ ಸರಬರಾಜು",
    "Roads and Infrastructure": "ರಸ್ತೆ ಮತ್ತು ಮೂಲಸೌಕರ್ಯ",
    "Sanitation and Waste Management": "ನೈರ್ಮಲ್ಯ ಮತ್ತು ತ್ಯಾಜ್ಯ ನಿರ್ವಹಣೆ",
}

STATUS_MESSAGES_EN = {
    "Pending": "has been registered successfully. Our concerned department will review your complaint.",
    "Assigned": "has been assigned to the concerned department officer for field inspection.",
    "In Progress": "is currently being addressed by our field service team.",
    "Resolved": "has been marked as resolved. Thank you for helping us improve civic services.",
    "Rejected": "has been reviewed and closed. Please refer to the officer remarks for details.",
}

STATUS_MESSAGES_KN = {
    "Pending": "ಯಶಸ್ವಿಯಾಗಿ ನೋಂದಾಯಿಸಲಾಗಿದೆ. ಸಂಬಂಧಪಟ್ಟ ಇಲಾಖೆಯು ನಿಮ್ಮ ದೂರನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ.",
    "Assigned": "ಸಂಬಂಧಪಟ್ಟ ಇಲಾಖಾ ಅಧಿಕಾರಿಗೆ ಪರಿಶೀಲನೆಗಾಗಿ ನಿಯೋಜಿಸಲಾಗಿದೆ.",
    "In Progress": "ಪ್ರಸ್ತುತ ನಮ್ಮ ಕ್ಷೇತ್ರ ಸೇವಾ ತಂಡದಿಂದ ಪರಿಹರಿಸಲಾಗುತ್ತಿದೆ.",
    "Resolved": "ಪರಿಹರಿಸಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಲಾಗಿದೆ. ನಾಗರಿಕ ಸೇವೆಗಳನ್ನು ಸುಧಾರಿಸಲು ಸಹಕರಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು.",
    "Rejected": "ಪರಿಶೀಲಿಸಿ ಮುಕ್ತಾಯಗೊಳಿಸಲಾಗಿದೆ. ವಿವರಗಳಿಗಾಗಿ ಅಧಿಕಾರಿಗಳ ಟಿಪ್ಪಣಿಯನ್ನು ನೋಡಿ.",
}

URGENCY_NOTE_EN = {
    "High": " Given the high urgency, this grievance has been prioritized for immediate attention.",
    "Medium": " Our team will address this within standard priority timelines.",
    "Low": "",
}

URGENCY_NOTE_KN = {
    "High": " ಈ ದೂರಿನ ತುರ್ತು ಸ್ಥಿತಿಯನ್ನು ಗಮನದಲ್ಲಿಟ್ಟುಕೊಂಡು, ತಕ್ಷಣದ ಕ್ರಮಕ್ಕೆ ಆದ್ಯತೆ ನೀಡಲಾಗಿದೆ.",
    "Medium": " ನಮ್ಮ ತಂಡವು ನಿಗದಿತ ಕಾಲಮಿತಿಯಲ್ಲಿ ಇದನ್ನು ಪರಿಹರಿಸುತ್ತದೆ.",
    "Low": "",
}


def generate_bilingual_response(category: str, urgency: str, status: str = "Pending", language: str = "English") -> dict:
    cat_en = category.lower()
    cat_kn = CATEGORY_LABELS_KN.get(category, category)

    status_en = STATUS_MESSAGES_EN.get(status, STATUS_MESSAGES_EN["Pending"])
    status_kn = STATUS_MESSAGES_KN.get(status, STATUS_MESSAGES_KN["Pending"])

    urg_en = URGENCY_NOTE_EN.get(urgency, "")
    urg_kn = URGENCY_NOTE_KN.get(urgency, "")

    response_en = f"Your {cat_en} complaint {status_en}{urg_en}"
    response_kn = f"ನಿಮ್ಮ {cat_kn} ದೂರನ್ನು {status_kn}{urg_kn}"

    return {
        "response_en": response_en,
        "response_kn": response_kn,
        "primary_response": response_kn if language == "Kannada" else response_en,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--generate", action="store_true")
    args = parser.parse_args()
    if args.generate:
        payload = json.loads(sys.stdin.read() or "{}")
        out = generate_bilingual_response(
            category=payload.get("category", "Water Supply"),
            urgency=payload.get("urgency", "Medium"),
            status=payload.get("status", "Pending"),
            language=payload.get("language", "English"),
        )
        print(json.dumps(out, ensure_ascii=False))
