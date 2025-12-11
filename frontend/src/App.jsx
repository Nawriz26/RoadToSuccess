import { useEffect, useState } from "react";
import axios from "axios";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_BASE = "http://localhost:4000/api";

/* ---------- SweetAlert2 toast helper ---------- */
const Toast = Swal.mixin({
  toast: true,
  position: "top-right",
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
  showClass: {
    popup: "swal2-show",
  },
  hideClass: {
    popup: "swal2-hide",
  },
});

/* ---------- Shared helpers ---------- */

const isTaskSubmitted = (task) =>
  (task.submission_link || "").toLowerCase() === "yes";

const getRowClass = (task) => (isTaskSubmitted(task) ? "table-success" : "");

const getDueClass = (dueDateStr) => {
  if (!dueDateStr) return "";
  const today = new Date();
  const due = new Date(dueDateStr);
  const diffMs = due - today;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "text-danger fw-semibold"; // overdue
  if (diffDays <= 3) return "text-warning fw-semibold"; // soon
  return "small fw-bold"; // normal
};

const getPriorityBadgeClass = (priority) => {
  switch (priority) {
    case "High":
      return "badge bg-danger";
    case "Medium":
      return "badge bg-warning text-dark";
    case "Low":
    default:
      return "badge bg-secondary";
  }
};

/* Nice label for due date urgency */
const getDueLabel = (dueDateStr) => {
  if (!dueDateStr) return null;

  const today = new Date();
  const due = new Date(dueDateStr);

  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const dueMid = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diffMs = dueMid - todayMid;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0)
    return { text: "Today", className: "badge bg-danger ms-1" };
  if (diffDays === 1)
    return { text: "Tomorrow", className: "badge bg-warning text-dark ms-1" };
  if (diffDays > 1 && diffDays <= 7)
    return {
      text: `In ${diffDays} days`,
      className: "badge bg-info text-dark ms-1",
    };
  if (diffDays < 0)
    return {
      text: `${Math.abs(diffDays)} day(s) overdue`,
      className: "badge bg-danger ms-1",
    };
  return null;
};

/* ---------- Pages ---------- */

/* Programs page */
function ProgramsPage({
  programs,
  newProgram,
  setNewProgram,
  handleAddProgram,
  handleEditProgram,
  handleDeleteProgram,
}) {
  return (
    <div className="row g-4 justify-content-center">
      <div className="col-lg-10 col-xl-8">
        <div className="card shadow-sm border-0 main-inner-card">
          <div className="card-header border-bottom">
            <h2 className="mb-0 text-light">Programs</h2>
          </div>
          <div className="card-body">
            <form className="mb-3" onSubmit={handleAddProgram}>
              <div className="mb-2">
                <label className="form-label small text-light">
                  <h4>Program name</h4>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Computer Science"
                  value={newProgram.name}
                  onChange={(e) =>
                    setNewProgram({ ...newProgram, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="mb-2">
                <label className="form-label small text-light">
                  <h4>College/University</h4>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Conestoga College"
                  value={newProgram.college}
                  onChange={(e) =>
                    setNewProgram({ ...newProgram, college: e.target.value })
                  }
                />
              </div>
              <div className="mb-2">
                <label className="form-label small text-light">
                  <h4>Semester</h4>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Fall 2025"
                  value={newProgram.semester}
                  onChange={(e) =>
                    setNewProgram({ ...newProgram, semester: e.target.value })
                  }
                />
              </div>

              <button type="submit" className="btn btn-sm btn-add w-100 mt-2">
                <h5>Add Program</h5>
              </button>
            </form>

            <hr />

            <div className="mb-2 small text-light-important">
              <strong>
                <h4>Total programs: {programs.length}</h4>
              </strong>
            </div>

            <ul className="list-group list-group-flush small">
              {programs.length === 0 && (
                <li className="list-group-item px-0 py-1 text-muted">
                  No programs yet.
                </li>
              )}
              {programs.map((p) => (
                <li
                  key={p.id}
                  className="list-group-item d-flex flex-column px-5 py-3 courses-list-item"
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1">
                        <span className="fw-bold">{p.name}</span>
                      </h6>
                      <div className="small text-muted">
                        {p.college || "College not set"}
                        {p.semester ? ` • ${p.semester}` : ""}
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() => handleEditProgram(p)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-delete"
                        onClick={() => handleDeleteProgram(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Home: My Tasks */
function HomePage({
  filteredTasks,
  statusFilter,
  setStatusFilter,
  onStatusClick,
  handleRowSubmittedChange,
  courses,
  programs,
  selectedProgramFilter,
  onProgramFilterChange,
  selectedCourseId,
  onCourseFilterChange,
  overdueCount,
  nextWeekCount,
  completedCount,
  completionRate,
  onEditTask,
  onDeleteTask,
}) {
  return (
    <>
      {/* Stats row */}
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm stats-card">
            <div className="card-body py-2">
              <div className="small stats-title">
                <strong>Overdue</strong>
              </div>
              <div className="fw-bold text-danger fs-5">{overdueCount}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm stats-card">
            <div className="card-body py-2">
              <div className="small stats-title">
                <strong>Due in 7 Days</strong>
              </div>
              <div className="fw-bold text-warning fs-5">{nextWeekCount}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm stats-card">
            <div className="card-body py-2">
              <div className="small stats-title">
                <strong>Completed</strong>
              </div>
              <div className="fw-bold text-success fs-5">
                {completedCount}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm stats-card">
            <div className="card-body py-2">
              <div className="small stats-title">
                <strong>Completion</strong>
              </div>
              <div className="fw-bold fs-5 stats-title">
                {completionRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks card */}
      <div className="card shadow-sm border-0 main-inner-card">
        <div className="card-header border-bottom d-flex align-items-center">
          <h2 className="mb-0 text-light">My Tasks</h2>

          {/* Filters section */}
          <div className="ms-auto d-flex align-items-end gap-3">
            {/* Program Filter */}
            <div className="d-flex flex-column">
              <label className="form-label small mb-0 text-light">
                <strong>Program</strong>
              </label>
              <select
                className="form-select form-select-sm"
                style={{ width: "270px" }}
                value={selectedProgramFilter}
                onChange={(e) => onProgramFilterChange(e.target.value)}
              >
                <option value="">All Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Filter */}
            <div className="d-flex flex-column">
              <label className="form-label small mb-0 text-light">
                <strong>Course</strong>
              </label>
              <select
                className="form-select form-select-sm"
                style={{ width: "370px" }}
                value={selectedCourseId}
                onChange={(e) => onCourseFilterChange(e.target.value)}
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="d-flex flex-column">
              <label className="form-label small mb-0 text-light">
                <strong>Status</strong>
              </label>
              <select
                className="form-select form-select-sm"
                style={{ width: "170px" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Not Completed">Not Completed</option>
                <option value="In progress">In progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <span className="small text-light ms-2">
              <strong>Total: {filteredTasks.length}</strong>
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle mb-0 table-dark-mode">
              <thead className="table-head-dark">
                <tr>
                  <th style={{ width: "50%" }}>Course / Program</th>
                  <th style={{ width: "18%" }}>Title</th>
                  <th style={{ width: "10%" }}>Type</th>
                  <th style={{ width: "16%" }}>Due</th>
                  <th style={{ width: "10%" }}>Status</th>
                  <th style={{ width: "8%" }}>Priority</th>
                  <th style={{ width: "7%" }}>Weight</th>
                  <th style={{ width: "9%" }}>Submitted?</th>
                  <th style={{ width: "10%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => {
                  const dueLabel = getDueLabel(t.due_date);
                  return (
                    <tr key={t.id} className={getRowClass(t)}>
                      <td>
                        <div className="fw-semibold">
                          {/* Example: "Computer Science - CS 1111-01" */}
                          {t.course_code
                            ? `${t.course_code} - ${t.course_name}`
                            : t.course_name}
                        </div>
                        <div className="small">{t.program_name}</div>
                      </td>
                      <td className="small">{t.title}</td>
                      <td className="small">{t.type}</td>
                      <td className={getDueClass(t.due_date)}>
                        <div className="small">
                          {t.due_date || "-"}
                        </div>
                        {dueLabel && (
                          <span className={dueLabel.className}>
                            {dueLabel.text}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ width: "120px" }}
                          onClick={() => onStatusClick(t)}
                        >
                          {t.status}
                        </button>
                      </td>
                      <td>
                        <span className={getPriorityBadgeClass(t.priority)}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="small">
                        {t.weight ? `${t.weight}%` : "-"}
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={isTaskSubmitted(t) ? "Yes" : "No"}
                          onChange={(e) =>
                            handleRowSubmittedChange(t, e.target.value)
                          }
                        >
                          <option>No</option>
                          <option>Yes</option>
                        </select>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn"
                            style={{
                              backgroundColor: "#2629d9",
                              color: "white",
                              fontWeight: "bold",
                              border: "1px solid white",
                            }}
                            onClick={() => onEditTask(t)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn"
                            style={{
                              backgroundColor: "#7c0416",
                              color: "white",
                              fontWeight: "bold",
                              border: "1px solid white",
                            }}
                            onClick={() => onDeleteTask(t)}
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      <strong>
                        No tasks yet! Go to{" "}
                        <NavLink
                          to="/add-task"
                          className="text-decoration-underline fw-semibold"
                        >
                          Add Task
                        </NavLink>{" "}
                        tab to add your tasks 👆
                      </strong>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

/* Courses page: manage courses + progress, grouped by program */
function CoursesPage({
  courses,
  newCourse,
  setNewCourse,
  handleAddCourse,
  handleDeleteCourse,
  handleEditCourse,
  courseStats,
}) {
  // Group courses by program_name
  const groupedByProgram = courses.reduce((acc, c) => {
    const key = c.program_name || "No Program / Other";
    if (!acc[key]) acc[key] = [];
    acc[key] = [...acc[key], c];
    return acc;
  }, {});

  const hasCourses = courses.length > 0;

  return (
    <div className="row g-4 justify-content-center">
      <div className="col-lg-10 col-xl-8">
        <div className="card shadow-sm border-0 main-inner-card">
          <div className="card-header border-bottom">
            <h2 className="mb-0 text-light">Courses</h2>
          </div>

          <div className="card-body">
            {/* Add course form */}
            <form className="mb-3" onSubmit={handleAddCourse}>
              <div className="mb-2">
                <label className="form-label small text-light">
                  <h4>Course code</h4>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="COMP228"
                  value={newCourse.code}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, code: e.target.value })
                  }
                />
              </div>
              <div className="mb-2">
                <label className="form-label small text-light">
                  <h4>Course name</h4>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Java Programming"
                  value={newCourse.name}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, name: e.target.value })
                  }
                />
              </div>
              <button type="submit" className="btn btn-sm btn-add w-100 mt-2">
                <h5>Add Course</h5>
              </button>
            </form>

            <hr />

            <div className="mb-2 small text-light-important">
              <strong>
                <h4>Total courses: {courses.length}</h4>
              </strong>
            </div>

            <div>
              <div className="small fw-semibold mb-2 text-light">
                <h5>Course list</h5>
              </div>

              {!hasCourses && (
                <div className="text-muted small">No courses yet.</div>
              )}

              {hasCourses &&
                Object.entries(groupedByProgram).map(
                  ([programName, programCourses]) => (
                    <div key={programName} className="mb-4">
                      {/* Program heading */}
                      <div className="text-white fw-bold mb-2">
                        {programName}
                      </div>

                      <ul className="list-group list-group-flush small">
                        {programCourses.map((c) => {
                          const stats = courseStats[c.id] || {
                            total: 0,
                            completed: 0,
                          };
                          const pct =
                            stats.total === 0
                              ? 0
                              : Math.round(
                                  (stats.completed / stats.total) * 100
                                );

                          return (
                            <li
                              key={c.id}
                              className="list-group-item d-flex flex-column px-5 py-3 courses-list-item"
                            >
                              <div className="d-flex justify-content-between align-items-center">
                                <h6>
                                  <span>
                                    <span className="fw-bold">
                                      {c.code}
                                    </span>{" "}
                                    <span className="medium fw-semibold">
                                      – {c.name}
                                    </span>
                                  </span>
                                </h6>

                                <div className="d-flex gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-dark text-white"
                                    onClick={() => handleEditCourse(c)}
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-delete"
                                    onClick={() => handleDeleteCourse(c.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>

                              <div className="small text-muted mt-1">
                                {stats.completed}/{stats.total} tasks completed
                              </div>
                              <div
                                className="progress"
                                style={{ height: "4px" }}
                              >
                                <div
                                  className="progress-bar"
                                  role="progressbar"
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* Add Task page */
function AddTaskPage({ courses, newTask, setNewTask, handleAddTask }) {
  return (
    <div className="row g-4 justify-content-center">
      <div className="col-lg-8">
        <div className="card shadow-sm border-0 main-inner-card">
          <div className="card-header border-bottom d-flex align-items-center">
            <h2 className="mb-0 text-light">Add Task</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleAddTask}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small text-light">
                    <h5>Course</h5>
                  </label>
                  <select
                    className="form-select form-select-sm course-select"
                    value={newTask.course_id}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        course_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} – {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div></div>
                <div className="col-md-4">
                  <label className="form-label small text-light">
                    <h5>Title</h5>
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm course-title"
                    placeholder="Assignment 1"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div></div>
                <div className="col-md-4">
                  <label className="form-label small text-light">
                    <h5>Type</h5>
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={newTask.type}
                    onChange={(e) =>
                      setNewTask({ ...newTask, type: e.target.value })
                    }
                  >
                    <option>Quiz</option>
                    <option>Assignment</option>
                    <option>Exam</option>
                    <option>Group Project</option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label small text-light">
                    <h5>Due date</h5>
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={newTask.due_date}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        due_date: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label small text-light">
                    <h5>Status</h5>
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={newTask.status}
                    onChange={(e) =>
                      setNewTask({ ...newTask, status: e.target.value })
                    }
                  >
                    <option>Not Completed</option>
                    <option>In progress</option>
                    <option>Completed</option>
                  </select>
                </div>
                      <div></div>
                <div className="col-md-3">
                  <label className="form-label small text-light">
                    <h5>Priority</h5>
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value })
                    }
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label small text-light">
                    <h5>Weight (%)</h5>
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    min="0"
                    max="100"
                    placeholder="20"
                    value={newTask.weight}
                    onChange={(e) =>
                      setNewTask({ ...newTask, weight: e.target.value })
                    }
                  />
                </div>
                      <div></div>
                <div className="col-md-9">
                  <label className="form-label small text-light">
                    <h5>Notes</h5>
                  </label>
                  <textarea
                    className="form-control form-control-sm notes"
                    rows="2"
                    value={newTask.notes}
                    onChange={(e) =>
                      setNewTask({ ...newTask, notes: e.target.value })
                    }
                  />
                </div>
                    <div></div>
                <div className="col-12">
                  <button
                    type="submit"
                    className="btn btn-add btn-sm w-100 mt-1"
                  >
                    <h5>Add Task</h5>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main App ---------- */

function App() {
  const [programs, setPrograms] = useState([]);
  const [newProgram, setNewProgram] = useState({
    name: "",
    college: "",
    semester: "",
  });

  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [selectedProgramFilter, setSelectedProgramFilter] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [todayStr, setTodayStr] = useState("");

  const [newCourse, setNewCourse] = useState({
    program_id: "",
    code: "",
    name: "",
  });

  const [newTask, setNewTask] = useState({
    course_id: "",
    title: "",
    type: "Assignment",
    due_date: "",
    status: "Not Completed",
    priority: "Medium",
    weight: "",
    is_submitted: "No",
    notes: "",
  });

  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString("en-CA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setTodayStr(formatted);

    fetchPrograms();
    fetchCourses();
    fetchTasks();
  }, []);

  const fetchPrograms = async () => {
    const res = await axios.get(`${API_BASE}/programs`);
    setPrograms(res.data);
  };

  const fetchCourses = async () => {
    const res = await axios.get(`${API_BASE}/courses`);
    setCourses(res.data);
  };

  const fetchTasks = async () => {
    const res = await axios.get(`${API_BASE}/tasks`);
    // sort by due date
    const sorted = [...res.data].sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
    setTasks(sorted);
  };

  /* ---------- Derived stats ---------- */

  const msPerDay = 1000 * 60 * 60 * 24;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdueCount = tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    const dueMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((dueMid - today) / msPerDay);
    return diffDays < 0 && t.status !== "Completed";
  }).length;

  const nextWeekCount = tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    const dueMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((dueMid - today) / msPerDay);
    return diffDays >= 0 && diffDays <= 7 && t.status !== "Completed";
  }).length;

  const completedCount = tasks.filter((t) => t.status === "Completed").length;

  const completionRate =
    tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  // per-course stats
  const courseStats = tasks.reduce((acc, t) => {
    if (!acc[t.course_id]) acc[t.course_id] = { total: 0, completed: 0 };
    acc[t.course_id].total += 1;
    if (t.status === "Completed") acc[t.course_id].completed += 1;
    return acc;
  }, {});

  /* ---------- CRUD: Programs ---------- */

  const handleAddProgram = async (e) => {
    e.preventDefault();
    if (!newProgram.name) {
      Toast.fire({ icon: "error", title: "Program name required" });
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/programs`, newProgram);
      setPrograms((prev) => [...prev, res.data]);
      setNewProgram({ name: "", college: "", semester: "" });
      Toast.fire({ icon: "success", title: "Program added" });
    } catch {
      Toast.fire({ icon: "error", title: "Failed to add program" });
    }
  };

  const handleEditProgram = async (program) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Program",
      html: `
        <input id="swal-program-name" class="swal2-input" placeholder="Program name" value="${
          program.name
        }">
        <input id="swal-program-college" class="swal2-input" placeholder="College" value="${
          program.college || ""
        }">
        <input id="swal-program-semester" class="swal2-input" placeholder="Semester" value="${
          program.semester || ""
        }">
      `,
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#22c55e",
      focusConfirm: false,
      preConfirm: () => {
        const name = document
          .getElementById("swal-program-name")
          .value.trim();
        const college = document
          .getElementById("swal-program-college")
          .value.trim();
        const semester = document
          .getElementById("swal-program-semester")
          .value.trim();

        if (!name) {
          Swal.showValidationMessage("Program name is required");
          return;
        }

        return { name, college, semester };
      },
    });

    if (!formValues) return;

    const { name, college, semester } = formValues;

    try {
      await axios.put(`${API_BASE}/programs/${program.id}`, {
        name,
        college,
        semester,
      });
      await fetchPrograms();
      Toast.fire({ icon: "success", title: "Program updated" });
    } catch {
      Toast.fire({ icon: "error", title: "Failed to update program" });
    }
  };

  const handleDeleteProgram = async (id) => {
    const program = programs.find((p) => p.id === id);
    const label = program ? program.name : "this program";

    const result = await Swal.fire({
      title: "Delete program?",
      html: `<strong>${label}</strong><br><small>This will remove its courses and tasks.</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API_BASE}/programs/${id}`);
      await fetchPrograms();
      await fetchCourses();
      await fetchTasks();
      Toast.fire({ icon: "info", title: "Program deleted" });
    } catch {
      Toast.fire({ icon: "error", title: "Failed to delete program" });
    }
  };

  /* ---------- CRUD: Courses ---------- */

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.program_id || !newCourse.code || !newCourse.name) {
      Toast.fire({
        icon: "error",
        title: "Select program and enter code & name",
      });
      return;
    }

    try {
      const payload = {
        program_id: Number(newCourse.program_id),
        code: newCourse.code,
        name: newCourse.name,
      };
      const res = await axios.post(`${API_BASE}/courses`, payload);
      setCourses((prev) => [...prev, res.data]);
      setNewCourse({ program_id: "", code: "", name: "" });
      Toast.fire({ icon: "success", title: "Course added" });
    } catch {
      Toast.fire({ icon: "error", title: "Failed to add course" });
    }
  };

  const handleDeleteCourse = async (id) => {
    const course = courses.find((c) => c.id === id);
    const label = course ? `${course.code} – ${course.name}` : "this course";

    const result = await Swal.fire({
      title: "Delete course?",
      html: `<strong>${label}</strong><br><small>This will remove all its tasks.</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API_BASE}/courses/${id}`);
      await fetchCourses();
      await fetchTasks();
      Toast.fire({ icon: "info", title: "Course deleted" });
    } catch {
      Toast.fire({ icon: "error", title: "Failed to delete course" });
    }
  };

  const handleEditCourse = async (course) => {
    const programOptionsHtml = programs
      .map(
        (p) => `
      <option value="${p.id}" ${
          p.id === course.program_id ? "selected" : ""
        }>${p.name}</option>
    `
      )
      .join("");

    const { value: formValues } = await Swal.fire({
      title: "Edit Course",
      html: `
        <select id="swal-course-program" class="swal2-select">
          <option value="">Select program</option>
          ${programOptionsHtml}
        </select>
        <input id="swal-course-code" class="swal2-input" placeholder="Course code" value="${
          course.code
        }">
        <input id="swal-course-name" class="swal2-input" placeholder="Course name" value="${
          course.name
        }">
      `,
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#28a745",
      focusConfirm: false,
      preConfirm: () => {
        const program_id = document.getElementById(
          "swal-course-program"
        ).value;
        const code = document
          .getElementById("swal-course-code")
          .value.trim();
        const name = document
          .getElementById("swal-course-name")
          .value.trim();

        if (!program_id || !code || !name) {
          Swal.showValidationMessage(
            "Program, code, and name are required"
          );
          return;
        }
        return {
          program_id: Number(program_id),
          code,
          name,
        };
      },
    });

    if (!formValues) return;

    const { program_id, code, name } = formValues;

    try {
      await axios.put(`${API_BASE}/courses/${course.id}`, {
        program_id,
        code,
        name,
      });

      await fetchCourses();
      await fetchTasks();
      Toast.fire({ icon: "success", title: "Course updated" });
    } catch {
      Toast.fire({ icon: "error", title: "Failed to update course" });
    }
  };

  /* ---------- CRUD: Tasks ---------- */

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.course_id || !newTask.title || !newTask.due_date) {
      Toast.fire({ icon: "error", title: "Missing required fields" });
      return;
    }

    try {
      const { is_submitted, ...rest } = newTask;
      const payload = {
        ...rest,
        course_id: Number(newTask.course_id),
        weight: newTask.weight ? Number(newTask.weight) : null,
        submission_link: is_submitted,
      };

      await axios.post(`${API_BASE}/tasks`, payload);
      setNewTask({
        course_id: "",
        title: "",
        type: "Assignment",
        due_date: "",
        status: "Not Completed",
        priority: "Medium",
        weight: "",
        is_submitted: "No",
        notes: "",
      });
      await fetchTasks();

      Toast.fire({ icon: "success", title: "Task added" });
    } catch {
      Toast.fire({ icon: "error", title: "Failed to add task" });
    }
  };

  const updateTaskOnServer = async (taskId, updatedFields) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const payload = {
      course_id: task.course_id,
      title: updatedFields.title ?? task.title,
      type: updatedFields.type ?? task.type,
      due_date: updatedFields.due_date ?? task.due_date,
      status: updatedFields.status ?? task.status,
      priority: task.priority,
      weight: task.weight,
      submission_link:
        updatedFields.submission_link ?? task.submission_link,
      notes: task.notes,
    };

    try {
      await axios.put(`${API_BASE}/tasks/${taskId}`, payload);
      await fetchTasks();
      Toast.fire({ icon: "success", title: "Task updated" });
    } catch {
      Toast.fire({ icon: "error", title: "Failed to update task" });
    }
  };

  /* Status change via SweetAlert2 modal */
  const handleStatusClick = async (task) => {
    const { value: newStatus } = await Swal.fire({
      title: "Update status",
      input: "select",
      inputOptions: {
        "Not Completed": "Not Completed",
        "In progress": "In progress",
        Completed: "Completed",
      },
      inputValue: task.status,
      showCancelButton: true,
      confirmButtonText: "Update",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#0d6efd",
      cancelButtonColor: "#6c757d",
      customClass: {
        popup: "swal-update-status-popup",
      },
      inputAttributes: {
        style: "height: 50px; font-size: 1rem;",
      },
    });

    if (!newStatus) return; // cancelled

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    await updateTaskOnServer(task.id, { status: newStatus });
  };

  /* Submitted change with toast */
  const handleRowSubmittedChange = async (task, newValue) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, submission_link: newValue } : t
      )
    );
    await updateTaskOnServer(task.id, { submission_link: newValue });
  };

  /* Edit task (title, type, due) */
  const handleEditTask = async (task) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit task",
      html: `
        <input id="swal-input-title" class="swal2-input" placeholder="Title" value="${
          task.title || ""
        }">
        <select id="swal-input-type" class="swal2-select">
          <option ${task.type === "Quiz" ? "selected" : ""}>Quiz</option>
          <option ${
            task.type === "Assignment" ? "selected" : ""
          }>Assignment</option>
          <option ${task.type === "Exam" ? "selected" : ""}>Exam</option>
          <option ${
            task.type === "Group Project" ? "selected" : ""
          }>Group Project</option>
        </select>
        <input id="swal-input-due" type="date" class="swal2-input" value="${
          task.due_date || ""
        }">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const title = document
          .getElementById("swal-input-title")
          .value.trim();
        const type = document.getElementById("swal-input-type").value;
        const due_date = document
          .getElementById("swal-input-due")
          .value.trim();

        if (!title || !due_date) {
          Swal.showValidationMessage("Title and due date are required");
          return;
        }

        return { title, type, due_date };
      },
      customClass: {
        popup: "swal-edit-task-popup",
        confirmButton: "swal-save-btn",
        cancelButton: "swal-cancel-btn",
      },
    });

    if (!formValues) return;

    const { title, type, due_date } = formValues;

    // optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, title, type, due_date } : t
      )
    );

    await updateTaskOnServer(task.id, { title, type, due_date });
  };

  /* Delete task */
  const handleDeleteTask = async (task) => {
    const result = await Swal.fire({
      title: "Delete task?",
      html: `<strong>${task.title}</strong><br><small>${task.course_code} – ${task.course_name}</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API_BASE}/tasks/${task.id}`);
      await fetchTasks();
      Toast.fire({ icon: "info", title: "Task deleted" });
    } catch {
      Toast.fire({ icon: "error", title: "Failed to delete task" });
    }
  };

  /* Filters for tasks (program + course + status) */
  const handleProgramFilterChange = (value) => {
    setSelectedProgramFilter(value);
  };

  const handleCourseFilterChange = (value) => {
    setSelectedCourseId(value);
  };

  const filteredTasks = tasks.filter((task) => {
    if (
      selectedProgramFilter &&
      String(task.program_id) !== String(selectedProgramFilter)
    ) {
      return false;
    }
    if (
      selectedCourseId &&
      String(task.course_id) !== String(selectedCourseId)
    ) {
      return false;
    }
    if (statusFilter !== "all" && task.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-start py-4 app-bg">
      <div className="container main-shell p-3">
        {/* Top bar + nav */}
        <header className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span
              className="fw-bold fs-4"
              style={{ color: "#FFD700" }} // gold
            >
              Road to Success!
            </span>

            <span className="small d-flex align-items-center gap-2 text-light-important">
              <span role="img" aria-label="calendar">
                📅
              </span>
              <span>
                <strong className="fs-5">{todayStr}</strong>
              </span>
            </span>
          </div>

          {/* Tabs: Programs, Courses, Tasks, Add Task */}
          <ul className="nav justify-content-center gap-3 custom-nav-pills">
            <li className="nav-item">
              <NavLink
                to="/programs"
                className={({ isActive }) =>
                  "nav-link nav-pill " + (isActive ? "nav-pill-active" : "")
                }
              >
                Programs
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to="/courses"
                className={({ isActive }) =>
                  "nav-link nav-pill " + (isActive ? "nav-pill-active" : "")
                }
              >
                Courses
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to="/tasks"
                className={({ isActive }) =>
                  "nav-link nav-pill " + (isActive ? "nav-pill-active" : "")
                }
              >
                Tasks
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to="/add-task"
                className={({ isActive }) =>
                  "nav-link nav-pill " + (isActive ? "nav-pill-active" : "")
                }
              >
                Add Task
              </NavLink>
            </li>
          </ul>
        </header>

        {/* Main content card */}
        <div className="main-card mt-3">
          <Routes>
            <Route path="/" element={<Navigate to="/tasks" replace />} />
            <Route
              path="/programs"
              element={
                <ProgramsPage
                  programs={programs}
                  newProgram={newProgram}
                  setNewProgram={setNewProgram}
                  handleAddProgram={handleAddProgram}
                  handleEditProgram={handleEditProgram}
                  handleDeleteProgram={handleDeleteProgram}
                />
              }
            />
            <Route
              path="/courses"
              element={
                <CoursesPage
                  programs={programs}
                  courses={courses}
                  newCourse={newCourse}
                  setNewCourse={setNewCourse}
                  handleAddCourse={handleAddCourse}
                  handleDeleteCourse={handleDeleteCourse}
                  handleEditCourse={handleEditCourse}
                  courseStats={courseStats}
                />
              }
            />
            <Route
              path="/tasks"
              element={
                <HomePage
                  filteredTasks={filteredTasks}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  onStatusClick={handleStatusClick}
                  handleRowSubmittedChange={handleRowSubmittedChange}
                  courses={courses}
                  programs={programs}
                  selectedProgramFilter={selectedProgramFilter}
                  onProgramFilterChange={handleProgramFilterChange}
                  selectedCourseId={selectedCourseId}
                  onCourseFilterChange={handleCourseFilterChange}
                  overdueCount={overdueCount}
                  nextWeekCount={nextWeekCount}
                  completedCount={completedCount}
                  completionRate={completionRate}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                />
              }
            />
            <Route
              path="/add-task"
              element={
                <AddTaskPage
                  courses={courses}
                  newTask={newTask}
                  setNewTask={setNewTask}
                  handleAddTask={handleAddTask}
                />
              }
            />
          </Routes>

          <div className="text-center small mt-4 footer-text">
            <strong>
              <em>Nawriz Ibrahim © 2025</em>
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
