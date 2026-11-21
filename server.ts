import crypto from "crypto";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = process.cwd();
const DB_PATH = path.resolve(ROOT_DIR, process.env.DATABASE_PATH || "civicconnect.db");
const UPLOAD_DIR = path.resolve(ROOT_DIR, process.env.UPLOAD_DIR || "uploads");
const NLP_SCRIPT = path.resolve(ROOT_DIR, "backend", "nlp_engine.py");
const RESPONSE_SCRIPT = path.resolve(ROOT_DIR, "backend", "response_generator.py");
const METRICS_PATH = path.resolve(ROOT_DIR, "backend", "models", "model_metrics.json");
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Initialize SQLite database
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
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
    nlp_probabilities_json TEXT,
    nlp_model_used TEXT,
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
`);

const DEPARTMENTS: Array<[string, string, string, string]> = [
  ["Water Supply", "WAT", "Drinking water pipelines, borewells, contamination, and water pressure", "water@civicconnect.gov.in"],
  ["Electricity", "ELC", "Power outages, street lights, transformers, and live wire hazards", "electricity@civicconnect.gov.in"],
  ["Roads and Infrastructure", "RDS", "Potholes, broken pavements, stormwater drains, and road repairs", "roads@civicconnect.gov.in"],
  ["Sanitation and Waste Management", "SAN", "Garbage collection, blocked drainage, sewage overflow, and public hygiene", "sanitation@civicconnect.gov.in"],
];

const insertDept = db.prepare(
  "INSERT OR IGNORE INTO Departments (name, code, description, contact_email) VALUES (?, ?, ?, ?)"
);
for (const dept of DEPARTMENTS) {
  insertDept.run(...dept);
}

// Optional env-configured officer bootstrap
const bootstrapOfficerEmail = (process.env.OFFICER_BOOTSTRAP_EMAIL || "").trim().toLowerCase();
const bootstrapOfficerPassword = process.env.OFFICER_BOOTSTRAP_PASSWORD || "";
if (bootstrapOfficerEmail && bootstrapOfficerPassword) {
  const existing = db.prepare("SELECT id FROM Officers WHERE email = ?").get(bootstrapOfficerEmail);
  const hash = bcrypt.hashSync(bootstrapOfficerPassword, 10);
  if (!existing) {
    db.prepare(
      "INSERT INTO Officers (full_name, email, employee_id, password_hash, role) VALUES (?, ?, ?, ?, 'admin_officer')"
    ).run("Nodal Grievance Officer", bootstrapOfficerEmail, "GOV-KA-1001", hash);
  } else {
    db.prepare("UPDATE Officers SET password_hash = ? WHERE email = ?").run(hash, bootstrapOfficerEmail);
  }
}

interface AuthUser {
  id: number;
  role: "citizen" | "officer";
  email: string;
  full_name: string;
}

interface AuthRequest extends Request {
  authUser?: AuthUser;
}

interface NlpResult {
  predicted_category: string;
  confidence: number;
  needs_human_review: boolean;
  detected_language: string;
  sentiment: string;
  urgency: string;
  class_probabilities: Record<string, number>;
  model_used: string;
  normalized_preview?: string;
}

interface BilingualResponse {
  response_en: string;
  response_kn: string;
  primary_response: string;
}

function runPythonStdinJson<T>(scriptPath: string, flag: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const child = execFile("python3", [scriptPath, flag], { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as T);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
    child.stdin?.write(JSON.stringify(payload));
    child.stdin?.end();
  });
}

function ensurePythonModelTrained(): Promise<void> {
  return new Promise((resolve) => {
    execFile("python3", [NLP_SCRIPT, "--ensure-trained"], { timeout: 20000 }, (err) => {
      if (err) {
        console.error("Failed to initialize Python NLP model:", err.message);
      }
      resolve();
    });
  });
}

function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: String(user.id), role: user.role, email: user.email, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

function requireAuth(allowedRoles?: Array<"citizen" | "officer">) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication token required." });
      return;
    }
    const token = authHeader.slice(7).trim();
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        sub: string;
        role: "citizen" | "officer";
        email: string;
        full_name: string;
      };
      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        res.status(403).json({ error: "Forbidden: insufficient permissions." });
        return;
      }
      req.authUser = {
        id: Number(decoded.sub),
        role: decoded.role,
        email: decoded.email,
        full_name: decoded.full_name,
      };
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired session token." });
    }
  };
}

const ALLOWED_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const ALLOWED_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.has(ext) || !ALLOWED_MIMES.has(file.mimetype)) {
      cb(new Error("Only PNG, JPG, JPEG, and WEBP images up to 5 MB are allowed."));
      return;
    }
    cb(null, true);
  },
});

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const VALID_STATUSES = new Set(["Pending", "Assigned", "In Progress", "Resolved", "Rejected"]);
const VALID_CATEGORIES = new Set([
  "Water Supply",
  "Electricity",
  "Roads and Infrastructure",
  "Sanitation and Waste Management",
]);

function generateComplaintCode(): string {
  const year = new Date().getUTCFullYear();
  const row = db.prepare("SELECT MAX(id) AS max_id FROM Complaints").get() as { max_id: number | null };
  const nextNum = (row?.max_id ?? 0) + 1;
  return `CC-${year}-${String(nextNum).padStart(4, "0")}`;
}

function buildOfficerFilters(query: Request["query"]): { whereSql: string; params: Array<string | number> } {
  const clauses = ["1=1"];
  const params: Array<string | number> = [];

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const category = str(query.category);
  const status = str(query.status);
  const urgency = str(query.urgency);
  const sentiment = str(query.sentiment);
  const location = str(query.location);
  const needsReview = str(query.needs_review);
  const dateFrom = str(query.date_from);
  const dateTo = str(query.date_to);
  const search = str(query.search);

  if (category) {
    clauses.push("c.final_category = ?");
    params.push(category);
  }
  if (status) {
    clauses.push("c.status = ?");
    params.push(status);
  }
  if (urgency) {
    clauses.push("c.urgency = ?");
    params.push(urgency);
  }
  if (sentiment) {
    clauses.push("c.sentiment = ?");
    params.push(sentiment);
  }
  if (location) {
    clauses.push("c.location LIKE ?");
    params.push(`%${location}%`);
  }
  if (needsReview === "true") {
    clauses.push("c.needs_human_review = 1 AND c.human_verified = 0");
  }
  if (dateFrom) {
    clauses.push("DATE(c.created_at) >= DATE(?)");
    params.push(dateFrom);
  }
  if (dateTo) {
    clauses.push("DATE(c.created_at) <= DATE(?)");
    params.push(dateTo);
  }
  if (search) {
    const like = `%${search}%`;
    clauses.push("(c.complaint_code LIKE ? OR c.title LIKE ? OR c.description LIKE ? OR u.full_name LIKE ?)");
    params.push(like, like, like, like);
  }

  return { whereSql: clauses.join(" AND "), params };
}

async function startServer() {
  await ensurePythonModelTrained();

  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Health
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "CivicConnect AI" });
  });

  // Safe image upload serving with path confinement
  app.get("/api/uploads/:filename", (req, res) => {
    const safeName = path.basename(req.params.filename || "");
    const resolved = path.resolve(UPLOAD_DIR, safeName);
    if (!resolved.startsWith(UPLOAD_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: "Attachment not found." });
      return;
    }
    res.sendFile(resolved);
  });

  // ---------------- AUTH ROUTES ----------------

  app.post("/api/auth/citizen/register", (req, res) => {
    const body = req.body || {};
    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const preferredLanguage = body.preferred_language === "kn" ? "kn" : "en";
    const wardLocation = String(body.ward_location || "Bengaluru Central").trim();

    if (fullName.length < 2) {
      res.status(400).json({ error: "Full name must be at least 2 characters." });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      res.status(400).json({ error: "Please enter a valid 10-digit phone number." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }

    const existing = db.prepare("SELECT id FROM Users WHERE email = ?").get(email);
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare(
        "INSERT INTO Users (full_name, email, phone, password_hash, preferred_language, ward_location) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(fullName, email, phone, passwordHash, preferredLanguage, wardLocation);

    const userId = Number(info.lastInsertRowid);
    const token = signToken({ id: userId, role: "citizen", email, full_name: fullName });

    res.status(201).json({
      token,
      user: {
        id: userId,
        full_name: fullName,
        email,
        phone,
        preferred_language: preferredLanguage,
        ward_location: wardLocation,
        role: "citizen",
      },
    });
  });

  app.post("/api/auth/citizen/login", (req, res) => {
    const body = req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const user = db.prepare("SELECT * FROM Users WHERE email = ?").get(email) as
      | {
          id: number;
          full_name: string;
          email: string;
          phone: string;
          password_hash: string;
          preferred_language: string;
          ward_location: string;
        }
      | undefined;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const token = signToken({ id: user.id, role: "citizen", email: user.email, full_name: user.full_name });
    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        preferred_language: user.preferred_language,
        ward_location: user.ward_location,
        role: "citizen",
      },
    });
  });

  app.get("/api/auth/officer/status", (_req, res) => {
    const row = db.prepare("SELECT COUNT(*) AS cnt FROM Officers").get() as { cnt: number };
    const envConfigured = Boolean(bootstrapOfficerEmail && bootstrapOfficerPassword);
    res.json({
      needsSetup: row.cnt === 0 && !envConfigured,
      envConfigured,
    });
  });

  app.post("/api/auth/officer/setup", (req, res) => {
    if (bootstrapOfficerEmail && bootstrapOfficerPassword) {
      res.status(403).json({ error: "Officer account is managed by environment secrets." });
      return;
    }

    const body = req.body || {};
    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const employeeId = String(body.employee_id || "GOV-KA-1001").trim();
    const password = String(body.password || "");

    if (fullName.length < 2) {
      res.status(400).json({ error: "Officer full name is required." });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: "Please enter a valid official email address." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Officer password must be at least 8 characters." });
      return;
    }

    // Atomic check-and-insert transaction so first-run setup locks immediately once claimed
    const setupTx = db.transaction(() => {
      const countRow = db.prepare("SELECT COUNT(*) AS cnt FROM Officers").get() as { cnt: number };
      if (countRow.cnt > 0) {
        return null;
      }
      const passwordHash = bcrypt.hashSync(password, 10);
      const info = db
        .prepare(
          "INSERT INTO Officers (full_name, email, employee_id, password_hash, role) VALUES (?, ?, ?, ?, 'admin_officer')"
        )
        .run(fullName, email, employeeId, passwordHash);
      return Number(info.lastInsertRowid);
    });

    const newOfficerId = setupTx();
    if (!newOfficerId) {
      res.status(409).json({ error: "An officer account has already been configured. Please sign in." });
      return;
    }

    const token = signToken({ id: newOfficerId, role: "officer", email, full_name: fullName });
    res.status(201).json({
      token,
      user: {
        id: newOfficerId,
        full_name: fullName,
        email,
        employee_id: employeeId,
        department_name: "All Departments",
        officer_role: "admin_officer",
        role: "officer",
      },
    });
  });

  app.post("/api/auth/officer/login", (req, res) => {
    const body = req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      res.status(400).json({ error: "Official email and password are required." });
      return;
    }

    const officer = db
      .prepare(
        `SELECT o.*, d.name AS department_name
         FROM Officers o
         LEFT JOIN Departments d ON o.department_id = d.id
         WHERE o.email = ?`
      )
      .get(email) as
      | {
          id: number;
          full_name: string;
          email: string;
          employee_id: string;
          password_hash: string;
          department_id: number | null;
          department_name: string | null;
          role: string;
        }
      | undefined;

    if (!officer || !bcrypt.compareSync(password, officer.password_hash)) {
      res.status(401).json({ error: "Invalid official credentials." });
      return;
    }

    const token = signToken({ id: officer.id, role: "officer", email: officer.email, full_name: officer.full_name });
    res.json({
      token,
      user: {
        id: officer.id,
        full_name: officer.full_name,
        email: officer.email,
        employee_id: officer.employee_id,
        department_id: officer.department_id,
        department_name: officer.department_name || "All Departments",
        officer_role: officer.role,
        role: "officer",
      },
    });
  });

  app.get("/api/auth/me", requireAuth(), (req: AuthRequest, res) => {
    res.json({ user: req.authUser });
  });

  // ---------------- CITIZEN ROUTES ----------------

  app.get("/api/citizen/dashboard", requireAuth(["citizen"]), (req: AuthRequest, res) => {
    const userId = req.authUser!.id;
    const stats = db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending,
          COALESCE(SUM(CASE WHEN status IN ('Assigned', 'In Progress') THEN 1 ELSE 0 END), 0) AS in_progress,
          COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolved
         FROM Complaints WHERE user_id = ?`
      )
      .get(userId) as Record<string, number>;

    const categoryStats = db
      .prepare(
        "SELECT final_category AS category, COUNT(*) AS count FROM Complaints WHERE user_id = ? GROUP BY final_category"
      )
      .all(userId);

    const recentComplaints = db
      .prepare(
        `SELECT c.*, d.name AS department_name
         FROM Complaints c
         LEFT JOIN Departments d ON c.department_id = d.id
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC
         LIMIT 6`
      )
      .all(userId);

    const unreadRow = db
      .prepare("SELECT COUNT(*) AS cnt FROM Notifications WHERE user_id = ? AND is_read = 0")
      .get(userId) as { cnt: number };

    res.json({
      stats: { ...stats, unread_notifications: unreadRow?.cnt ?? 0 },
      category_stats: categoryStats,
      recent_complaints: recentComplaints,
    });
  });

  app.post(
    "/api/citizen/complaints",
    requireAuth(["citizen"]),
    (req: AuthRequest, res: Response, next: NextFunction) => {
      upload.single("image")(req, res, (err) => {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        next();
      });
    },
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.authUser!.id;
        const title = String(req.body?.title || "").trim();
        const description = String(req.body?.description || "").trim();
        const location = String(req.body?.location || "").trim();

        if (title.length < 4) {
          res.status(400).json({ error: "Complaint title must be at least 4 characters." });
          return;
        }
        if (description.length < 10) {
          res.status(400).json({ error: "Complaint description must be at least 10 characters." });
          return;
        }
        if (!location) {
          res.status(400).json({ error: "Please select or enter a complaint location." });
          return;
        }

        const nlp = await runPythonStdinJson<NlpResult>(NLP_SCRIPT, "--analyze", { title, description });
        const responses = await runPythonStdinJson<BilingualResponse>(RESPONSE_SCRIPT, "--generate", {
          category: nlp.predicted_category,
          urgency: nlp.urgency,
          status: "Pending",
          language: nlp.detected_language,
        });

        const complaintCode = generateComplaintCode();
        const dept = db
          .prepare("SELECT id FROM Departments WHERE name = ?")
          .get(nlp.predicted_category) as { id: number } | undefined;
        const deptId = dept ? dept.id : null;
        const imageName = req.file ? req.file.filename : null;

        const insertTx = db.transaction(() => {
          const info = db
            .prepare(
              `INSERT INTO Complaints (
                complaint_code, user_id, title, description, detected_language,
                location, image_path, predicted_category, final_category, department_id,
                sentiment, urgency, nlp_confidence, needs_human_review, human_verified,
                status, auto_response_en, auto_response_kn, nlp_probabilities_json, nlp_model_used
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, ?, ?, ?)`
            )
            .run(
              complaintCode,
              userId,
              title,
              description,
              nlp.detected_language,
              location,
              imageName,
              nlp.predicted_category,
              nlp.predicted_category,
              deptId,
              nlp.sentiment,
              nlp.urgency,
              nlp.confidence,
              nlp.needs_human_review ? 1 : 0,
              responses.response_en,
              responses.response_kn,
              JSON.stringify(nlp.class_probabilities),
              nlp.model_used
            );

          const complaintId = Number(info.lastInsertRowid);

          db.prepare(
            `INSERT INTO Complaint_Status_History (complaint_id, old_status, new_status, changed_by_role, changed_by_id, note)
             VALUES (?, NULL, 'Pending', 'citizen', ?, ?)`
          ).run(complaintId, userId, "Grievance registered and classified by Python NLP engine.");

          db.prepare(
            "INSERT INTO Notifications (user_id, complaint_id, message_en, message_kn) VALUES (?, ?, ?, ?)"
          ).run(
            userId,
            complaintId,
            `[${complaintCode}] ${responses.response_en}`,
            `[${complaintCode}] ${responses.response_kn}`
          );

          return complaintId;
        });

        const complaintId = insertTx();
        const created = db
          .prepare(
            `SELECT c.*, d.name AS department_name
             FROM Complaints c
             LEFT JOIN Departments d ON c.department_id = d.id
             WHERE c.id = ?`
          )
          .get(complaintId);

        res.status(201).json({
          message: "Complaint registered successfully.",
          complaint: created,
          nlp_analysis: nlp,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to submit complaint.";
        res.status(500).json({ error: message });
      }
    }
  );

  app.get("/api/citizen/complaints", requireAuth(["citizen"]), (req: AuthRequest, res) => {
    const userId = req.authUser!.id;
    const statusFilter = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    let sql = `
      SELECT c.*, d.name AS department_name
      FROM Complaints c
      LEFT JOIN Departments d ON c.department_id = d.id
      WHERE c.user_id = ?
    `;
    const params: Array<string | number> = [userId];

    if (statusFilter) {
      sql += " AND c.status = ?";
      params.push(statusFilter);
    }
    if (search) {
      const like = `%${search}%`;
      sql += " AND (c.complaint_code LIKE ? OR c.title LIKE ? OR c.description LIKE ? OR c.location LIKE ?)";
      params.push(like, like, like, like);
    }
    sql += " ORDER BY c.created_at DESC";

    const complaints = db.prepare(sql).all(...params);
    res.json({ complaints });
  });

  app.get("/api/citizen/complaints/track/:code", requireAuth(["citizen"]), (req: AuthRequest, res) => {
    const userId = req.authUser!.id;
    const code = String(req.params.code || "").trim();

    const complaint = db
      .prepare(
        `SELECT c.*, d.name AS department_name
         FROM Complaints c
         LEFT JOIN Departments d ON c.department_id = d.id
         WHERE UPPER(c.complaint_code) = UPPER(?) AND c.user_id = ?`
      )
      .get(code, userId) as { id: number } | undefined;

    if (!complaint) {
      res.status(404).json({ error: "No complaint found with that ID under your account." });
      return;
    }

    const history = db
      .prepare("SELECT * FROM Complaint_Status_History WHERE complaint_id = ? ORDER BY created_at ASC")
      .all(complaint.id);
    const remarks = db
      .prepare(
        `SELECT r.*, o.full_name AS officer_name
         FROM Officer_Remarks r
         JOIN Officers o ON r.officer_id = o.id
         WHERE r.complaint_id = ?
         ORDER BY r.created_at DESC`
      )
      .all(complaint.id);

    res.json({ complaint, history, remarks });
  });

  app.get("/api/citizen/notifications", requireAuth(["citizen"]), (req: AuthRequest, res) => {
    const rows = db
      .prepare(
        `SELECT n.*, c.complaint_code
         FROM Notifications n
         JOIN Complaints c ON n.complaint_id = c.id
         WHERE n.user_id = ?
         ORDER BY n.created_at DESC
         LIMIT 25`
      )
      .all(req.authUser!.id);
    res.json({ notifications: rows });
  });

  app.patch("/api/citizen/notifications/:id/read", requireAuth(["citizen"]), (req: AuthRequest, res) => {
    const notifId = Number(req.params.id);
    db.prepare("UPDATE Notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(notifId, req.authUser!.id);
    res.json({ message: "Notification marked as read." });
  });

  // ---------------- SHARED DETAIL ROUTE ----------------

  app.get("/api/complaints/:id", requireAuth(["citizen", "officer"]), (req: AuthRequest, res) => {
    const complaintId = Number(req.params.id);
    const complaint = db
      .prepare(
        `SELECT c.*, d.name AS department_name, u.full_name AS citizen_name, u.email AS citizen_email, u.phone AS citizen_phone
         FROM Complaints c
         LEFT JOIN Departments d ON c.department_id = d.id
         JOIN Users u ON c.user_id = u.id
         WHERE c.id = ?`
      )
      .get(complaintId) as { id: number; user_id: number } | undefined;

    if (!complaint) {
      res.status(404).json({ error: "Complaint not found." });
      return;
    }
    if (req.authUser!.role === "citizen" && complaint.user_id !== req.authUser!.id) {
      res.status(403).json({ error: "Unauthorized access to this complaint." });
      return;
    }

    const history = db
      .prepare("SELECT * FROM Complaint_Status_History WHERE complaint_id = ? ORDER BY created_at ASC")
      .all(complaintId);
    const remarks = db
      .prepare(
        `SELECT r.*, o.full_name AS officer_name, o.employee_id
         FROM Officer_Remarks r
         JOIN Officers o ON r.officer_id = o.id
         WHERE r.complaint_id = ?
         ORDER BY r.created_at DESC`
      )
      .all(complaintId);

    res.json({ complaint, history, remarks });
  });

  // ---------------- OFFICER ROUTES ----------------

  app.get("/api/officer/dashboard", requireAuth(["officer"]), (_req, res) => {
    const summary = db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending,
          COALESCE(SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END), 0) AS assigned,
          COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0) AS in_progress,
          COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolved,
          COALESCE(SUM(CASE WHEN needs_human_review = 1 AND human_verified = 0 THEN 1 ELSE 0 END), 0) AS needs_review,
          COALESCE(SUM(CASE WHEN urgency = 'High' AND status != 'Resolved' THEN 1 ELSE 0 END), 0) AS high_urgency_open
         FROM Complaints`
      )
      .get();

    const recent = db
      .prepare(
        `SELECT c.*, d.name AS department_name, u.full_name AS citizen_name
         FROM Complaints c
         LEFT JOIN Departments d ON c.department_id = d.id
         JOIN Users u ON c.user_id = u.id
         ORDER BY c.created_at DESC
         LIMIT 8`
      )
      .all();

    const lowConf = db
      .prepare(
        `SELECT c.*, d.name AS department_name, u.full_name AS citizen_name
         FROM Complaints c
         LEFT JOIN Departments d ON c.department_id = d.id
         JOIN Users u ON c.user_id = u.id
         WHERE c.needs_human_review = 1 AND c.human_verified = 0
         ORDER BY c.nlp_confidence ASC, c.created_at DESC
         LIMIT 5`
      )
      .all();

    res.json({
      stats: summary,
      recent_complaints: recent,
      low_confidence_queue: lowConf,
    });
  });

  app.get("/api/officer/departments", requireAuth(["officer"]), (_req, res) => {
    const departments = db.prepare("SELECT * FROM Departments ORDER BY name ASC").all();
    res.json({ departments });
  });

  app.get("/api/officer/complaints", requireAuth(["officer"]), (req, res) => {
    const { whereSql, params } = buildOfficerFilters(req.query);
    const rows = db
      .prepare(
        `SELECT c.*, d.name AS department_name, u.full_name AS citizen_name, u.phone AS citizen_phone
         FROM Complaints c
         LEFT JOIN Departments d ON c.department_id = d.id
         JOIN Users u ON c.user_id = u.id
         WHERE ${whereSql}
         ORDER BY c.created_at DESC`
      )
      .all(...params);
    res.json({ complaints: rows });
  });

  app.patch("/api/officer/complaints/:id", requireAuth(["officer"]), async (req: AuthRequest, res: Response) => {
    try {
      const complaintId = Number(req.params.id);
      const existing = db.prepare("SELECT * FROM Complaints WHERE id = ?").get(complaintId) as
        | {
            id: number;
            user_id: number;
            complaint_code: string;
            status: string;
            final_category: string;
            department_id: number | null;
            urgency: string;
            detected_language: string;
            human_verified: number;
          }
        | undefined;

      if (!existing) {
        res.status(404).json({ error: "Complaint not found." });
        return;
      }

      const body = req.body || {};
      const newStatus = typeof body.status === "string" ? body.status : existing.status;
      if (!VALID_STATUSES.has(newStatus)) {
        res.status(400).json({ error: "Invalid status value." });
        return;
      }

      const newCategory = typeof body.final_category === "string" ? body.final_category : existing.final_category;
      if (!VALID_CATEGORIES.has(newCategory)) {
        res.status(400).json({ error: "Invalid category value." });
        return;
      }

      let departmentId =
        body.department_id !== undefined && body.department_id !== null && body.department_id !== ""
          ? Number(body.department_id)
          : existing.department_id;

      if (body.final_category && (body.department_id === undefined || body.department_id === "")) {
        const dept = db.prepare("SELECT id FROM Departments WHERE name = ?").get(newCategory) as
          | { id: number }
          | undefined;
        if (dept) departmentId = dept.id;
      }

      const humanVerified = body.human_verified !== undefined ? (body.human_verified ? 1 : 0) : existing.human_verified;
      const note = String(body.note || "").trim();

      const bilingual = await runPythonStdinJson<BilingualResponse>(RESPONSE_SCRIPT, "--generate", {
        category: newCategory,
        urgency: existing.urgency,
        status: newStatus,
        language: existing.detected_language,
      });

      const updateTx = db.transaction(() => {
        db.prepare(
          `UPDATE Complaints
           SET status = ?, final_category = ?, department_id = ?, human_verified = ?,
               auto_response_en = ?, auto_response_kn = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        ).run(
          newStatus,
          newCategory,
          departmentId,
          humanVerified,
          bilingual.response_en,
          bilingual.response_kn,
          complaintId
        );

        if (newStatus !== existing.status || note || newCategory !== existing.final_category) {
          const histNote = note || `Updated by ${req.authUser!.full_name}`;
          db.prepare(
            `INSERT INTO Complaint_Status_History (complaint_id, old_status, new_status, changed_by_role, changed_by_id, note)
             VALUES (?, ?, ?, 'officer', ?, ?)`
          ).run(complaintId, existing.status, newStatus, req.authUser!.id, histNote);
        }

        if (newStatus !== existing.status) {
          db.prepare(
            "INSERT INTO Notifications (user_id, complaint_id, message_en, message_kn) VALUES (?, ?, ?, ?)"
          ).run(
            existing.user_id,
            complaintId,
            `[${existing.complaint_code}] Status updated to ${newStatus}: ${bilingual.response_en}`,
            `[${existing.complaint_code}] ಸ್ಥಿತಿ '${newStatus}' ಗೆ ನವೀಕರಿಸಲಾಗಿದೆ: ${bilingual.response_kn}`
          );
        }
      });

      updateTx();
      const updated = db
        .prepare(
          `SELECT c.*, d.name AS department_name
           FROM Complaints c
           LEFT JOIN Departments d ON c.department_id = d.id
           WHERE c.id = ?`
        )
        .get(complaintId);

      res.json({ message: "Complaint updated successfully.", complaint: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update complaint.";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/officer/complaints/:id/remarks", requireAuth(["officer"]), (req: AuthRequest, res) => {
    const complaintId = Number(req.params.id);
    const body = req.body || {};
    const remarkEn = String(body.remark_en || "").trim();
    const remarkKn = String(body.remark_kn || "").trim();
    const isResolution = body.is_resolution_note ? 1 : 0;

    if (!remarkEn) {
      res.status(400).json({ error: "Official remark text is required." });
      return;
    }

    const complaint = db.prepare("SELECT id, user_id, complaint_code FROM Complaints WHERE id = ?").get(complaintId) as
      | { id: number; user_id: number; complaint_code: string }
      | undefined;

    if (!complaint) {
      res.status(404).json({ error: "Complaint not found." });
      return;
    }

    db.prepare(
      "INSERT INTO Officer_Remarks (complaint_id, officer_id, remark_en, remark_kn, is_resolution_note) VALUES (?, ?, ?, ?, ?)"
    ).run(complaintId, req.authUser!.id, remarkEn, remarkKn, isResolution);

    db.prepare(
      "INSERT INTO Notifications (user_id, complaint_id, message_en, message_kn) VALUES (?, ?, ?, ?)"
    ).run(
      complaint.user_id,
      complaintId,
      `[${complaint.complaint_code}] Officer remark: ${remarkEn}`,
      `[${complaint.complaint_code}] ಅಧಿಕಾರಿಗಳ ಟಿಪ್ಪಣಿ: ${remarkKn || remarkEn}`
    );

    res.status(201).json({ message: "Officer remark added." });
  });

  app.get("/api/officer/reports/export", requireAuth(["officer"]), (req, res) => {
    const { whereSql, params } = buildOfficerFilters(req.query);
    const rows = db
      .prepare(
        `SELECT c.complaint_code, u.full_name AS citizen_name, c.title, c.detected_language,
                c.location, c.predicted_category, c.final_category, d.name AS department_name,
                c.sentiment, c.urgency, c.nlp_confidence, c.needs_human_review,
                c.human_verified, c.status, c.created_at
         FROM Complaints c
         LEFT JOIN Departments d ON c.department_id = d.id
         JOIN Users u ON c.user_id = u.id
         WHERE ${whereSql}
         ORDER BY c.created_at DESC`
      )
      .all(...params) as Array<Record<string, unknown>>;

    const escapeCsv = (val: unknown) => {
      const s = String(val ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };

    const headers = [
      "Complaint ID",
      "Citizen",
      "Title",
      "Language",
      "Location",
      "Predicted Category",
      "Final Category",
      "Department",
      "Sentiment",
      "Urgency",
      "NLP Confidence",
      "Needs Review",
      "Human Verified",
      "Status",
      "Created At",
    ];
    const lines = [headers.map(escapeCsv).join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.complaint_code,
          r.citizen_name,
          r.title,
          r.detected_language,
          r.location,
          r.predicted_category,
          r.final_category,
          r.department_name,
          r.sentiment,
          r.urgency,
          r.nlp_confidence,
          Boolean(r.needs_human_review),
          Boolean(r.human_verified),
          r.status,
          r.created_at,
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=civicconnect_grievances_report.csv");
    res.send(lines.join("\n"));
  });

  // ---------------- ANALYTICS ROUTE ----------------

  app.get("/api/analytics/overview", requireAuth(["officer"]), (_req, res) => {
    const totals = db
      .prepare(
        `SELECT
          COUNT(*) AS total_grievances,
          COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending,
          COALESCE(SUM(CASE WHEN status IN ('Assigned', 'In Progress') THEN 1 ELSE 0 END), 0) AS active,
          COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolved,
          COALESCE(ROUND(AVG(nlp_confidence), 4), 0) AS avg_confidence,
          COALESCE(SUM(CASE WHEN needs_human_review = 1 THEN 1 ELSE 0 END), 0) AS low_confidence_total
         FROM Complaints`
      )
      .get();

    const categoryDist = db
      .prepare("SELECT final_category AS name, COUNT(*) AS value FROM Complaints GROUP BY final_category")
      .all();

    const monthlyTrends = db
      .prepare(
        `SELECT strftime('%Y-%m', created_at) AS month,
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved
         FROM Complaints
         GROUP BY strftime('%Y-%m', created_at)
         ORDER BY month ASC`
      )
      .all();

    const urgencyDist = db
      .prepare("SELECT urgency AS name, COUNT(*) AS value FROM Complaints GROUP BY urgency")
      .all();

    const sentimentDist = db
      .prepare("SELECT sentiment AS name, COUNT(*) AS value FROM Complaints GROUP BY sentiment")
      .all();

    const deptPerf = db
      .prepare(
        `SELECT d.name AS department,
                COUNT(c.id) AS total,
                COALESCE(SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolved,
                COALESCE(SUM(CASE WHEN c.status != 'Resolved' THEN 1 ELSE 0 END), 0) AS open_cases
         FROM Departments d
         LEFT JOIN Complaints c ON d.id = c.department_id
         GROUP BY d.id, d.name`
      )
      .all();

    const locationDist = db
      .prepare(
        "SELECT location AS name, COUNT(*) AS count FROM Complaints GROUP BY location ORDER BY count DESC LIMIT 10"
      )
      .all();

    const languageDist = db
      .prepare("SELECT detected_language AS name, COUNT(*) AS value FROM Complaints GROUP BY detected_language")
      .all();

    const confBuckets = db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN nlp_confidence < 0.55 THEN 1 ELSE 0 END), 0) AS below_55,
          COALESCE(SUM(CASE WHEN nlp_confidence >= 0.55 AND nlp_confidence < 0.75 THEN 1 ELSE 0 END), 0) AS mid_55_75,
          COALESCE(SUM(CASE WHEN nlp_confidence >= 0.75 THEN 1 ELSE 0 END), 0) AS above_75
         FROM Complaints`
      )
      .get() as { below_55: number; mid_55_75: number; above_75: number };

    let nlpModelMetrics: unknown = null;
    if (fs.existsSync(METRICS_PATH)) {
      nlpModelMetrics = JSON.parse(fs.readFileSync(METRICS_PATH, "utf-8"));
    }

    res.json({
      summary: totals,
      category_distribution: categoryDist,
      monthly_trends: monthlyTrends,
      urgency_distribution: urgencyDist,
      sentiment_distribution: sentimentDist,
      department_performance: deptPerf,
      location_distribution: locationDist,
      language_distribution: languageDist,
      confidence_buckets: [
        { range: "< 0.55 (Flagged)", count: confBuckets.below_55 },
        { range: "0.55 - 0.75", count: confBuckets.mid_55_75 },
        { range: ">= 0.75 (High)", count: confBuckets.above_75 },
      ],
      nlp_model_metrics: nlpModelMetrics,
    });
  });

  // Vite integration in dev vs static serving in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CivicConnect AI running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start CivicConnect AI server:", err);
  process.exit(1);
});
