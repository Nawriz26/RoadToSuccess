const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// DB setup
const dbPath = path.join(__dirname, "iamonit.db");
const db = new sqlite3.Database(dbPath);

// Enable FK constraints
db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON;");

  // Programs
  db.run(`
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      college TEXT,
      semester TEXT
    )
  `);

  // Courses (with program_id)
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
    )
  `);

  // Tasks
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT,
      weight REAL,
      submission_link TEXT,
      notes TEXT,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `);
});

/* -------------------- PROGRAMS -------------------- */

// Get all programs
app.get("/api/programs", (req, res) => {
  db.all("SELECT * FROM programs ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add program
app.post("/api/programs", (req, res) => {
  const { name, college, semester } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  db.run(
    `INSERT INTO programs (name, college, semester) VALUES (?, ?, ?)`,
    [name, college || null, semester || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        id: this.lastID,
        name,
        college: college || "",
        semester: semester || "",
      });
    }
  );
});

// Update program
app.put("/api/programs/:id", (req, res) => {
  const { id } = req.params;
  const { name, college, semester } = req.body;

  if (!name) return res.status(400).json({ error: "name is required" });

  db.run(
    `UPDATE programs SET name = ?, college = ?, semester = ? WHERE id = ?`,
    [name, college || null, semester || null, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Delete program (cascades courses + tasks via FK)
app.delete("/api/programs/:id", (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM programs WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

/* -------------------- COURSES -------------------- */

// Get all courses (with program_name)
app.get("/api/courses", (req, res) => {
  const sql = `
    SELECT
      c.id,
      c.program_id,
      c.code,
      c.name,
      p.name AS program_name
    FROM courses c
    JOIN programs p ON p.id = c.program_id
    ORDER BY p.name ASC, c.code ASC
  `;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add course
app.post("/api/courses", (req, res) => {
  const { program_id, code, name } = req.body;
  if (!program_id || !code || !name) {
    return res.status(400).json({ error: "program_id, code, name are required" });
  }

  db.run(
    `INSERT INTO courses (program_id, code, name) VALUES (?, ?, ?)`,
    [program_id, code, name],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // Return row with program_name
      db.get(
        `
        SELECT c.id, c.program_id, c.code, c.name, p.name AS program_name
        FROM courses c
        JOIN programs p ON p.id = c.program_id
        WHERE c.id = ?
        `,
        [this.lastID],
        (err2, row) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.status(201).json(row);
        }
      );
    }
  );
});

// Update course
app.put("/api/courses/:id", (req, res) => {
  const { id } = req.params;
  const { program_id, code, name } = req.body;

  if (!program_id || !code || !name) {
    return res.status(400).json({ error: "program_id, code, name are required" });
  }

  db.run(
    `UPDATE courses SET program_id = ?, code = ?, name = ? WHERE id = ?`,
    [program_id, code, name, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Delete course (cascades tasks via FK)
app.delete("/api/courses/:id", (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM courses WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

/* -------------------- TASKS -------------------- */

// Get tasks (optionally filter by course_id OR program_id)
app.get("/api/tasks", (req, res) => {
  const { course_id, program_id } = req.query;

  let sql = `
    SELECT
      t.*,
      c.code AS course_code,
      c.name AS course_name,
      c.program_id AS program_id,
      p.name AS program_name
    FROM tasks t
    JOIN courses c ON c.id = t.course_id
    JOIN programs p ON p.id = c.program_id
  `;

  const params = [];
  const where = [];

  if (course_id) {
    where.push("t.course_id = ?");
    params.push(course_id);
  }
  if (program_id) {
    where.push("c.program_id = ?");
    params.push(program_id);
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");

  sql += " ORDER BY t.due_date ASC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add task
app.post("/api/tasks", (req, res) => {
  const {
    course_id,
    title,
    type,
    due_date,
    status,
    priority,
    weight,
    submission_link,
    notes,
  } = req.body;

  if (!course_id || !title || !type || !due_date || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    `
    INSERT INTO tasks
    (course_id, title, type, due_date, status, priority, weight, submission_link, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      course_id,
      title,
      type,
      due_date,
      status,
      priority || null,
      weight || null,
      submission_link || null,
      notes || null,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update task
app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const {
    course_id,
    title,
    type,
    due_date,
    status,
    priority,
    weight,
    submission_link,
    notes,
  } = req.body;

  db.run(
    `
    UPDATE tasks
    SET course_id = ?, title = ?, type = ?, due_date = ?, status = ?,
        priority = ?, weight = ?, submission_link = ?, notes = ?
    WHERE id = ?
    `,
    [
      course_id,
      title,
      type,
      due_date,
      status,
      priority || null,
      weight || null,
      submission_link || null,
      notes || null,
      id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Delete task
app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM tasks WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
