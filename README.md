# CivicConnect AI – Multilingual Citizen Grievance Management System

AI-powered municipal grievance redressal platform supporting **Kannada (ಕನ್ನಡ)**, **English**, and **Kanglish** complaints with automated NLP classification, urgency & sentiment scoring, bilingual response generation, SQLite persistence, and dedicated Citizen and Government Officer portals.

## Architecture

- **Frontend (`src/`)**: React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide Icons, React Router.
- **Full-Stack Server (`server.ts`)**: Express API + SQLite (`better-sqlite3`) + `multer` image uploads + `bcryptjs` password hashing + JWT role-based authentication + Vite SSR/SPA middleware on port `3000`.
- **Python NLP & ML Engine (`backend/`)**:
  - `backend/nlp_pipeline.py`: Regex Kannada Unicode detection (`\u0C80-\u0CFF`), Kanglish & Kannada root-stem normalization, stop-word removal, lexicon sentiment analysis, urgency detection.
  - `backend/nlp_engine.py`: TF-IDF vectorization + Logistic Regression, Multinomial Naive Bayes, and Linear SVM with stratified holdout evaluation (`backend/models/model_metrics.json`) and automatic human-review flagging when confidence `< 0.55`.
  - `backend/response_generator.py`: Bilingual Kannada and English automated status response generator.
  - `backend/app.py` & `backend/requirements.txt`: Standalone Flask reference server for Python-only deployments.

## Setup & Running Locally

1. Install Node dependencies:
   ```bash
   npm install
   ```
2. (Optional) Configure environment variables in `.env` based on `.env.example` (such as `OFFICER_BOOTSTRAP_EMAIL` and `OFFICER_BOOTSTRAP_PASSWORD`).
3. Start the full-stack server (port `3000`):
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   npm start
   ```

## First-Run Officer Setup

- If `OFFICER_BOOTSTRAP_EMAIL` and `OFFICER_BOOTSTRAP_PASSWORD` are configured in environment secrets, the Nodal Officer account is bootstrapped automatically.
- Otherwise, visit `/officer/login` on first run to claim and configure the initial Nodal Grievance Officer credentials securely. Once claimed, the setup form locks automatically.
