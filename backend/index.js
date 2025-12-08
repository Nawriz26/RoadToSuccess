const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// DB setup (iamonit.db in the root of the project)
const dbPath = path.join(__dirname, 'iamonit.db');
const db = new sqlite3.Database(dbPath);

// Create tables if not exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL
    )
  `);

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


// --------- COURSES ROUTES ---------

// Get all courses
app.get('/api/courses', (req, res) => {
  db.all('SELECT * FROM courses', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new course
app.post('/api/courses', (req, res) => {
  const { code, name } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'code and name are required' });
  }
  db.run(
    'INSERT INTO courses (code, name) VALUES (?, ?)',
    [code, name],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, code, name });
    }
  );
});

// ✅ Delete a course (and its tasks)
app.delete('/api/courses/:id', (req, res) => {
  const { id } = req.params;

  // First delete tasks for this course
  db.run('DELETE FROM tasks WHERE course_id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    // Then delete the course itself
    db.run('DELETE FROM courses WHERE id = ?', [id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ deleted: this.changes });
    });
  });
});


// --------- TASKS ROUTES ---------

// Get all tasks (optionally filter by course)
app.get('/api/tasks', (req, res) => {
  const { course_id } = req.query;
  let sql = `
    SELECT tasks.*, courses.code AS course_code, courses.name AS course_name
    FROM tasks
    JOIN courses ON tasks.course_id = courses.id
  `;
  const params = [];

  if (course_id) {
    sql += ' WHERE course_id = ?';
    params.push(course_id);
  }

  sql += ' ORDER BY due_date ASC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new task
app.post('/api/tasks', (req, res) => {
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
    return res.status(400).json({ error: 'Missing required fields' });
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
app.put('/api/tasks/:id', (req, res) => {
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
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM tasks WHERE id = ?', id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
