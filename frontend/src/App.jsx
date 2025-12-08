import { useEffect, useState } from "react";
import axios from "axios";
import { Routes, Route, NavLink } from "react-router-dom";
import Swal from "sweetalert2";

const API_BASE = "http://localhost:4000/api";

/* ---------- SweetAlert2 toast helper (Bootstrap-like) ---------- */
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
  return "text-success"; // normal
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

  // normalize to midnight
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

/* Home: Your Tasks */
function HomePage({
  filteredTasks,
  statusFilter,
  setStatusFilter,
  onStatusClick,
  handleRowSubmittedChange,
  courses,
  selectedCourseId,
  onCourseFilterChange,
  overdueCount,
  nextWeekCount,
  completedCount,
  completionRate,
}) {
  return (
    <>
      {/* Stats row */}
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-2">
              <div className="small stats-title">Overdue</div>
              <div className="fw-bold text-danger fs-5">{overdueCount}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-2">
              <div className="small stats-title">Due in 7 days</div>
              <div className="fw-bold text-warning fs-5">{nextWeekCount}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-2">
             <div className="small stats-title">Completed</div>
              <div className="fw-bold text-success fs-5">
                {completedCount}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-2">
              <div className="small stats-title">Completion</div>
              <div className="fw-bold fs-5">{completionRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks card */}
      <div className="card shadow-sm border-0">
        <div className="card-header border-bottom d-flex align-items-center">
          <h5 className="mb-0">Your Tasks</h5>

          {/* Filters section */}
          <div className="ms-auto d-flex align-items-end gap-3">
            {/* Course Filter */}
            <div className="d-flex flex-column">
              <label className="form-label small mb-0">Course</label>
              <select
                className="form-select form-select-sm"
                style={{ width: "210px" }}
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
              <label className="form-label small mb-0">Status</label>
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

            <span className="small text-muted ms-2">
              Total: {filteredTasks.length}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "30%" }}>Course</th>
                  <th style={{ width: "20%" }}>Title</th>
                  <th style={{ width: "10%" }}>Type</th>
                  <th style={{ width: "16%" }}>Due</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "10%" }}>Priority</th>
                  <th style={{ width: "8%" }}>Weight</th>
                  <th style={{ width: "12%" }}>Submitted?</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => {
                  const dueLabel = getDueLabel(t.due_date);
                  return (
                    <tr key={t.id} className={getRowClass(t)}>
                      <td>
                        <div className="fw-semibold small">{t.course_code}</div>
                        <div className="text-muted small">
                          {t.course_name}
                        </div>
                      </td>
                      <td className="small">{t.title}</td>
                      <td className="small">{t.type}</td>
                      <td className={getDueClass(t.due_date)}>
                        <div className="small">{t.due_date || "-"}</div>
                        {dueLabel && (
                          <span className={dueLabel.className}>
                            {dueLabel.text}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
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
                    </tr>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No tasks yet. Go to <strong>Add Task</strong> page to add
                      some 👆
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

/* Courses page: manage courses + progress */
function CoursesPage({
  courses,
  newCourse,
  setNewCourse,
  handleAddCourse,
  handleDeleteCourse,
  courseStats,
}) {
  return (
    <div className="row g-4 justify-content-center">
    <div className="col-lg-10 col-xl-8">

        <div className="card shadow-sm border-0">
          <div className="card-header border-bottom">
            <h5 className="mb-0">Courses</h5>
          </div>
          <div className="card-body">
            <form className="mb-3" onSubmit={handleAddCourse}>
              <div className="mb-2">
                <label className="form-label small">Course code</label>
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
                <label className="form-label small">Course name</label>
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
              <button
                type="submit"
                className="btn btn-sm btn-add w-100 mt-2"
              >
                Add Course
              </button>
            </form>

            <hr />

            <div className="mb-2 small text-light-important">

              Total courses: {courses.length}
            </div>

            <div>
              <div className="small fw-semibold mb-1">Courses list</div>
              <ul className="list-group list-group-flush small">
                {courses.length === 0 && (
                  <li className="list-group-item px-0 py-1 text-muted">
                    No courses yet.
                  </li>
                )}
                {courses.map((c) => {
                  const stats = courseStats[c.id] || {
                    total: 0,
                    completed: 0,
                  };
                  const pct =
                    stats.total === 0
                      ? 0
                      : Math.round((stats.completed / stats.total) * 100);
                  return (
                    <li
                      key={c.id}
                      className="list-group-item d-flex flex-column px-5 py-3 courses-list-item"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>
                          <span className="fw-semibold">{c.code}</span>{" "}
                          <span className="text-muted">– {c.name}</span>
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-delete"
                          onClick={() => handleDeleteCourse(c.id)}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="small text-muted mt-1">
                        {stats.completed}/{stats.total} tasks completed
                      </div>
                      <div className="progress" style={{ height: "4px" }}>
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
          </div>
        </div>
      </div>
    </div>
  );
}

/* Tasks page: add new task */
function TasksPage({ courses, newTask, setNewTask, handleAddTask }) {
  return (
    <div className="row g-4 justify-content-center">
      <div className="col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header border-bottom d-flex align-items-center">
            <h5 className="mb-0">Add Task</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleAddTask}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small">Course</label>
                  <select
                    className="form-select form-select-sm"
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

                <div className="col-md-4">
                  <label className="form-label small">Title</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label small">Type</label>
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
                  <label className="form-label small">Due date</label>
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
                  <label className="form-label small">Status</label>
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

                <div className="col-md-3">
                  <label className="form-label small">Priority</label>
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
                  <label className="form-label small">Weight (%)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    min="0"
                    max="100"
                    value={newTask.weight}
                    onChange={(e) =>
                      setNewTask({ ...newTask, weight: e.target.value })
                    }
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label small">Is Submitted?</label>
                  <select
                    className="form-select form-select-sm"
                    value={newTask.is_submitted}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        is_submitted: e.target.value,
                      })
                    }
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>

                <div className="col-md-9">
                  <label className="form-label small">Notes</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="2"
                    value={newTask.notes}
                    onChange={(e) =>
                      setNewTask({ ...newTask, notes: e.target.value })
                    }
                  />
                </div>

                <div className="col-12">
                  <button
                    type="submit"
                    className="btn btn-add btn-sm w-100 mt-1"
                  >
                    Add Task
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
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [todayStr, setTodayStr] = useState("");

  const [newCourse, setNewCourse] = useState({ code: "", name: "" });
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

    fetchCourses();
    fetchTasks();
  }, []);

  const fetchCourses = async () => {
    const res = await axios.get(`${API_BASE}/courses`);
    setCourses(res.data);
  };

  const fetchTasks = async (course_id) => {
    const params = course_id ? { course_id } : {};
    const res = await axios.get(`${API_BASE}/tasks`, { params });

    // sort by due date (soonest first)
    const sorted = [...res.data].sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });

    setTasks(sorted);
  };

  /* ---------- Derived stats ---------- */

    /* ---------- Derived stats ---------- */

  const msPerDay = 1000 * 60 * 60 * 24;
  const now = new Date();

  // normalize "today" to midnight (no time component)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdueCount = tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    const dueMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((dueMid - today) / msPerDay);
    // negative = in the past
    return diffDays < 0 && t.status !== "Completed";
  }).length;

  const nextWeekCount = tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    const dueMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((dueMid - today) / msPerDay);
    // 0–7 days from today
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


  /* ---------- CRUD with SweetAlert toasts ---------- */

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.name) {
      Toast.fire({ icon: "error", title: "Enter code & name" });
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/courses`, newCourse);
      setCourses((prev) => [...prev, res.data]);
      setNewCourse({ code: "", name: "" });
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

      if (String(selectedCourseId) === String(id)) {
        setSelectedCourseId("");
        fetchTasks();
      } else {
        fetchTasks(selectedCourseId || null);
      }

      Toast.fire({ icon: "info", title: "Course deleted" });
    } catch {
      Toast.fire({ icon: "error", title: "Failed to delete course" });
    }
  };

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
      fetchTasks(selectedCourseId || null);

      Toast.fire({ icon: "success", title: "Task added" });
    } catch {
      Toast.fire({ icon: "error", title: "Failed to add task" });
    }
  };

  const handleCourseFilterChange = (value) => {
    setSelectedCourseId(value);
    fetchTasks(value || null);
  };

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === "all") return true;
    return task.status === statusFilter;
  });

  const updateTaskOnServer = async (taskId, updatedFields) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const payload = {
      course_id: task.course_id,
      title: task.title,
      type: task.type,
      due_date: task.due_date,
      status: updatedFields.status ?? task.status,
      priority: task.priority,
      weight: task.weight,
      submission_link: updatedFields.submission_link ?? task.submission_link,
      notes: task.notes,
    };

    try {
      await axios.put(`${API_BASE}/tasks/${taskId}`, payload);
      fetchTasks(selectedCourseId || null);
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

      // taller popup & select
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

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-start py-4 app-bg">
      <div className="container main-shell p-3">
        {/* Top bar + nav (separate from card) */}
        <header className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="fw-bold text-success fs-4">
              Road to Success!
            </span>
            <span className="text-muted small d-flex align-items-center gap-2">
              <span role="img" aria-label="calendar">
                📅
              </span>
              <span className="ms-auto small d-flex align-items-center gap-2 text-light-important">{todayStr}</span>
            </span>
          </div>

          {/* pill-style nav */}
          <ul className="nav justify-content-center gap-3 custom-nav-pills">
            <li className="nav-item">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  "nav-link nav-pill " + (isActive ? "nav-pill-active" : "")
                }
              >
                My Tasks
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
                Add Task
              </NavLink>
            </li>
          </ul>
        </header>

        {/* Main content card */}
        <div className="main-card mt-3">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  filteredTasks={filteredTasks}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  onStatusClick={handleStatusClick}
                  handleRowSubmittedChange={handleRowSubmittedChange}
                  courses={courses}
                  selectedCourseId={selectedCourseId}
                  onCourseFilterChange={handleCourseFilterChange}
                  overdueCount={overdueCount}
                  nextWeekCount={nextWeekCount}
                  completedCount={completedCount}
                  completionRate={completionRate}
                />
              }
            />
            <Route
              path="/courses"
              element={
                <CoursesPage
                  courses={courses}
                  newCourse={newCourse}
                  setNewCourse={setNewCourse}
                  handleAddCourse={handleAddCourse}
                  handleDeleteCourse={handleDeleteCourse}
                  courseStats={courseStats}
                />
              }
            />
            <Route
              path="/tasks"
              element={
                <TasksPage
                  courses={courses}
                  newTask={newTask}
                  setNewTask={setNewTask}
                  handleAddTask={handleAddTask}
                />
              }
            />
          </Routes>

          <div className="text-center small mt-4 footer-text">
            Nawriz Ibrahim © 2025
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
