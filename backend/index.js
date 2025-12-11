const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// DB setup (iamonit.db in the root of the project)
const dbPath = path.join(__dirname, "iamonit.db");
const db = new sqlite3.Database(dbPath);

// Create tables if not exist
db.serialize(() => {
  // Programs
  db.run(`
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      college TEXT,
      semester TEXT
    )
  `);

  // Courses (each course belongs to one program)
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (program_id) REFERENCES programs(id)
    )
  `);

  // Tasks (each task belongs to one course)
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,          -- Quiz / Assignment / Exam / Group Project
      due_date TEXT NOT NULL,      -- "2025-12-15"
      status TEXT NOT NULL,        -- Completed / In progress / Not Completed
      priority TEXT,               -- High / Medium / Low
      weight REAL,                 -- percentage
      submission_link TEXT,
      notes TEXT,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);
});

/* ===================== PROGRAMS ROUTES ===================== */

// Get all programs
app.get("/api/programs", (req, res) => {
  db.all(
    "SELECT * FROM programs ORDER BY name ASC",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Add a new program
app.post("/api/programs", (req, res) => {
  const { name, college, semester } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Program name is required" });
  }

  db.run(
    "INSERT INTO programs (name, college, semester) VALUES (?, ?, ?)",
    [name, college || null, semester || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        id: this.lastID,
        name,
        college: college || null,
        semester: semester || null,
      });
    }
  );
});

// Update a program
app.put("/api/programs/:id", (req, res) => {
  const { id } = req.params;
  const { name, college, semester } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ error: "Program name is required" });
  }

  db.run(
    `
    UPDATE programs
    SET name = ?, college = ?, semester = ?
    WHERE id = ?
  `,
    [name, college || null, semester || null, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Delete a program (and its courses & tasks)
app.delete("/api/programs/:id", (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    // Delete tasks for all courses in this program
    db.run(
      `
      DELETE FROM tasks
      WHERE course_id IN (
        SELECT id FROM courses WHERE program_id = ?
      )
    `,
      [id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Delete the courses themselves
        db.run(
          "DELETE FROM courses WHERE program_id = ?",
          [id],
          function (err2) {
            if (err2)
              return res
                .status(500)
                .json({ error: err2.message });

            // Finally delete the program
            db.run(
              "DELETE FROM programs WHERE id = ?",
              [id],
              function (err3) {
                if (err3)
                  return res
                    .status(500)
                    .json({ error: err3.message });
                res.json({ deleted: this.changes });
              }
            );
          }
        );
      }
    );
  });
});

/* ===================== COURSES ROUTES ===================== */

// Get all courses (optionally filter by program_id)
app.get("/api/courses", (req, res) => {
  const { program_id } = req.query;
  let sql = `
    SELECT courses.*, programs.name AS program_name
    FROM courses
    LEFT JOIN programs ON courses.program_id = programs.id
  `;
  const params = [];

  if (program_id) {
    sql += " WHERE courses.program_id = ?";
    params.push(program_id);
  }

  sql += " ORDER BY courses.code ASC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new course
app.post("/api/courses", (req, res) => {
  const { program_id, code, name } = req.body;
  if (!program_id || !code || !name) {
    return res
      .status(400)
      .json({ error: "program_id, code, and name are required" });
  }

  db.run(
    "INSERT INTO courses (program_id, code, name) VALUES (?, ?, ?)",
    [program_id, code, name],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        id: this.lastID,
        program_id,
        code,
        name,
      });
    }
  );
});

// Update course
app.put("/api/courses/:id", (req, res) => {
  const { id } = req.params;
  const { program_id, code, name } = req.body;

  if (!program_id || !code || !name) {
    return res
      .status(400)
      .json({ error: "program_id, code, and name are required" });
  }

  db.run(
    `
    UPDATE courses
    SET program_id = ?, code = ?, name = ?
    WHERE id = ?
  `,
    [program_id, code, name, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Delete a course (and its tasks)
app.delete("/api/courses/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM tasks WHERE course_id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    db.run("DELETE FROM courses WHERE id = ?", [id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ deleted: this.changes });
    });
  });
});

/* ===================== TASKS ROUTES ===================== */

// Get all tasks (optionally filter by course_id or program_id)
app.get("/api/tasks", (req, res) => {
  const { course_id, program_id } = req.query;

  let sql = `
    SELECT 
      tasks.*,
      courses.code AS course_code,
      courses.name AS course_name,
      programs.id AS program_id,
      programs.name AS program_name
    FROM tasks
    JOIN courses ON tasks.course_id = courses.id
    LEFT JOIN programs ON courses.program_id = programs.id
  `;

  const params = [];
  const whereClauses = [];

  if (course_id) {
    whereClauses.push("tasks.course_id = ?");
    params.push(course_id);
  }

  if (program_id) {
    whereClauses.push("courses.program_id = ?");
    params.push(program_id);
  }

  if (whereClauses.length > 0) {
    sql += " WHERE " + whereClauses.join(" AND ");
  }

  sql += " ORDER BY tasks.due_date ASC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new task
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
      res.status(201).json({
        id: this.lastID,
        course_id,
        title,
        type,
        due_date,
        status,
        priority,
        weight,
        submission_link,
        notes,
      });
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
      priority,
      weight,
      submission_link,
      notes,
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

  db.run("DELETE FROM tasks WHERE id = ?", id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
