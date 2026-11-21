import os
import sqlite3
from werkzeug.security import generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(BASE_DIR), "civicconnect.db"))

DEPARTMENTS = [
    ("Water Supply", "WAT", "Drinking water pipelines, borewells, contamination, and water pressure", "water@civicconnect.gov.in"),
    ("Electricity", "ELC", "Power outages, street lights, transformers, and live wire hazards", "electricity@civicconnect.gov.in"),
    ("Roads and Infrastructure", "RDS", "Potholes, broken pavements, stormwater drains, and road repairs", "roads@civicconnect.gov.in"),
    ("Sanitation and Waste Management", "SAN", "Garbage collection, blocked drainage, sewage overflow, and hygiene", "sanitation@civicconnect.gov.in"),
]


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            preferred_language TEXT NOT NULL DEFAULT 'en',
            ward_location TEXT NOT NULL DEFAULT 'Bengaluru Central',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS Departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            code TEXT NOT NULL UNIQUE,
            description TEXT,
            contact_email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS Officers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            employee_id TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            department_id INTEGER,
            role TEXT NOT NULL DEFAULT 'officer',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES Departments(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS Complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complaint_code TEXT NOT NULL UNIQUE,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            detected_language TEXT NOT NULL,
            location TEXT NOT NULL,
            image_path TEXT,
            predicted_category TEXT NOT NULL,
            final_category TEXT NOT NULL,
            department_id INTEGER,
            sentiment TEXT NOT NULL,
            urgency TEXT NOT NULL,
            nlp_confidence REAL NOT NULL,
            needs_human_review INTEGER NOT NULL DEFAULT 0,
            human_verified INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'Pending',
            auto_response_en TEXT NOT NULL,
            auto_response_kn TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
            FOREIGN KEY (department_id) REFERENCES Departments(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS Complaint_Status_History (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complaint_id INTEGER NOT NULL,
            old_status TEXT,
            new_status TEXT NOT NULL,
            changed_by_role TEXT NOT NULL,
            changed_by_id INTEGER NOT NULL,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (complaint_id) REFERENCES Complaints(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS Officer_Remarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complaint_id INTEGER NOT NULL,
            officer_id INTEGER NOT NULL,
            remark_en TEXT NOT NULL,
            remark_kn TEXT,
            is_resolution_note INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (complaint_id) REFERENCES Complaints(id) ON DELETE CASCADE,
            FOREIGN KEY (officer_id) REFERENCES Officers(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS Notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            complaint_id INTEGER NOT NULL,
            message_en TEXT NOT NULL,
            message_kn TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
            FOREIGN KEY (complaint_id) REFERENCES Complaints(id) ON DELETE CASCADE
        );
        """
    )
    for name, code, desc, email in DEPARTMENTS:
        cur.execute(
            "INSERT OR IGNORE INTO Departments (name, code, description, contact_email) VALUES (?, ?, ?, ?)",
            (name, code, desc, email),
        )
    bootstrap_email = os.getenv("OFFICER_BOOTSTRAP_EMAIL", "").strip().lower()
    bootstrap_pw = os.getenv("OFFICER_BOOTSTRAP_PASSWORD", "")
    if bootstrap_email and bootstrap_pw:
        existing = cur.execute("SELECT id FROM Officers WHERE email = ?", (bootstrap_email,)).fetchone()
        if not existing:
            cur.execute(
                "INSERT INTO Officers (full_name, email, employee_id, password_hash, role) VALUES (?, ?, ?, ?, 'admin_officer')",
                ("Nodal Grievance Officer", bootstrap_email, "GOV-KA-1001", generate_password_hash(bootstrap_pw)),
            )
    conn.commit()
    conn.close()
