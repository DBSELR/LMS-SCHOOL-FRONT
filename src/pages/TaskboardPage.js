import React, { useEffect, useState } from "react";
import HeaderTop from "../components/HeaderTop";
import RightSidebar from "../components/RightSidebar";
import LeftSidebar from "../components/LeftSidebar";
import Footer from "../components/Footer";
import { jwtDecode } from "jwt-decode";
import API_BASE_URL from "../config";

function TaskboardPage() {
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [tasks, setTasks] = useState({ todo: [], inProgress: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedToUserId: "",
    status: "todo"
  });
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const isFormValid =
    newTask.title.trim() !== "" &&
    newTask.description.trim() !== "" &&
    newTask.assignedToUserId !== "";

  const toCamel = (s) => s[0].toLowerCase() + s.slice(1);
  const normalizeKeys = (obj) =>
    Object.fromEntries(Object.entries(obj).map(([k, v]) => [toCamel(k), v]));

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setLoggedInUserId(decoded["UserId"] || decoded.userId);
      } catch (err) {
        console.error("Invalid token", err);
      }
    }
  }, []);

  useEffect(() => {
    if (loggedInUserId) {
      fetchTasks();
      fetchUsers();
    }
  }, [loggedInUserId]);

  useEffect(() => {
    filterAndGroupTasks(allTasks, searchQuery);
  }, [searchQuery]);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/taskboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      const normalized = data.map(normalizeKeys);
      setAllTasks(normalized);
      filterAndGroupTasks(normalized, searchQuery);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  };

  const filterAndGroupTasks = (taskList, query) => {
    const lowerQuery = query.toLowerCase();
    const filtered = taskList.filter((task) => {
      return (
        String(task.assignedToUserId) === String(loggedInUserId) &&
        (task.title.toLowerCase().includes(lowerQuery) ||
          (task.assignedToFullName || "").toLowerCase().includes(lowerQuery))
      );
    });

    const grouped = { todo: [], inProgress: [], done: [] };
    filtered.forEach((task) => {
      const status = task.status.toLowerCase();
      if (status === "todo") grouped.todo.push(task);
      else if (status === "inprogress") grouped.inProgress.push(task);
      else if (status === "done") grouped.done.push(task);
    });

    setTasks(grouped);
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/user`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      setUsers(data.map(normalizeKeys));
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid || isNaN(parseInt(newTask.assignedToUserId))) {
      alert("Please select a valid assignee.");
      return;
    }

    const method = editMode ? "PUT" : "POST";
    const url = editMode
      ? `${API_BASE_URL}/taskboard/${editTaskId}`
      : `${API_BASE_URL}/taskboard`;

    const payload = {
      ...newTask,
      assignedToUserId: parseInt(newTask.assignedToUserId),
      status: newTask.status.toLowerCase()
    };

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Request failed");

      resetModal();
      fetchTasks();
    } catch (err) {
      console.error("Failed to submit task", err);
    }
  };

  const handleEdit = (task) => {
    setEditMode(true);
    setEditTaskId(task.id);
    const match = users.some((u) => String(u.userId) === String(task.assignedToUserId));
    setNewTask({
      title: task.title,
      description: task.description,
      assignedToUserId: match ? String(task.assignedToUserId) : "",
      status: task.status.toLowerCase()
    });
    setTimeout(() => setModalOpen(true), 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/taskboard/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const task = Object.values(tasks).flat().find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask = { ...task, status: newStatus };

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/taskboard/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updatedTask)
      });

      if (res.ok) fetchTasks();
    } catch (err) {
      console.error("Status update failed", err);
    }
  };

  const resetModal = () => {
    setModalOpen(false);
    setEditMode(false);
    setEditTaskId(null);
    setNewTask({ title: "", description: "", assignedToUserId: "", status: "todo" });
  };

  const renderColumn = (colId, title, color) => (
    <div className="col-lg-4 col-md-6 mb-4" key={colId}>
      <div className="card shadow-sm h-100">
        <div className={`card-header ${color} text-white text-center`}>
          <h6 className="mb-0">{title}</h6>
        </div>
        <div className="card-body" style={{ minHeight: "200px" }}>
          {tasks[colId].map((task) => (
            <div key={task.id} className="card border shadow-sm mb-3 p-2">
              <h6 className="mb-1">{task.title}</h6>
              <p className="mb-1 text-muted">{task.description}</p>
              <select
                className="form-control form-control-sm mb-2"
                value={task.status.toLowerCase()}
                onChange={(e) => handleStatusChange(task.id, e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => handleEdit(task)}>Edit</button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(task.id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div id="main_content" className="font-muli theme-blush">
      {loading && <div className="page-loader-wrapper"><div className="loader" /></div>}
      <HeaderTop />
      <RightSidebar />
      <LeftSidebar />
      <div className="page">
        <div className="section-body mt-3">
          <div className="container-fluid">
            <div className="jumbotron bg-light p-4 rounded shadow-sm mb-4 welcome-card animate-welcome">
                          <h2 className="page-title text-primary">
                           <i class="fa-solid fa-list-alt"></i> Taskboard
                          </h2>
                          <p className="text-muted mb-0">
                            Manage your tasks efficiently with a visual board
                          </p>
                        </div>
              <div className="d-flex gap-2 align-items-center">
                <input
                  type="text"
                  className="form-control form-control-sm mb-3"
                  placeholder="Search by title or assignee..."
                  style={{ width: "350px" }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-sm btn-outline-primary ml-auto mb-3" onClick={() => setModalOpen(true)}>
                  + Add Task
                </button>
              </div>
            
            <div className="row">
              {renderColumn("todo", "To Do", "bg-info")}
              {renderColumn("inProgress", "In Progress", "bg-warning")}
              {renderColumn("done", "Done", "bg-success")}
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {modalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editMode ? "Edit Task" : "Create Task"}</h5>
                <button
                    type="button"
                    className="close"
                    onClick={resetModal}
                  >
                    <span>&times;</span>
                  </button>
              </div>
              <div className="modal-body">
                <input
                  className="form-control mb-2"
                  placeholder="Task Title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
                <textarea
                  className="form-control mb-2"
                  placeholder="Description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
                {users.length > 0 && (
                  <select
                    className="form-control mb-2"
                    value={newTask.assignedToUserId}
                    onChange={(e) => setNewTask({ ...newTask, assignedToUserId: e.target.value })}
                  >
                    <option value="">-- Select Assignee --</option>
                    {users.map((user) => {
                      const idStr = String(user.userId);
                      return (
                        <option key={idStr} value={idStr}>
                          {user.firstName} {user.lastName}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={resetModal}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                >
                  {editMode ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskboardPage;
