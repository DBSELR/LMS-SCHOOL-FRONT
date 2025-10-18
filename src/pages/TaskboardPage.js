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
    console.log("🔐 Token found:", !!token);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        console.log("📝 Decoded token:", decoded);
        
        // Check multiple possible user ID fields
        const userId = decoded["UserId"] || decoded.userId || decoded["user_id"] || decoded.id || decoded.sub;
        console.log("👤 Extracted userId:", userId);
        console.log("👤 UserId type:", typeof userId);
        
        // Convert to number if it's a valid number string
        const finalUserId = !isNaN(Number(userId)) ? Number(userId) : userId;
        console.log("👤 Final processed userId:", finalUserId);
        
        setLoggedInUserId(finalUserId);
      } catch (err) {
        console.error("❌ Invalid token", err);
      }
    }
  }, []);

  useEffect(() => {
    console.log("🔄 loggedInUserId changed:", loggedInUserId);
    if (loggedInUserId) {
      fetchTasks();
      fetchUsers();
    }
  }, [loggedInUserId]);

  useEffect(() => {
    filterAndGroupTasks(allTasks, searchQuery);
  }, [searchQuery]);

  const fetchTasks = async () => {
    console.log("📋 Fetching tasks...");
    try {
      const token = localStorage.getItem("jwt");
      const url = `${API_BASE_URL}/TaskBoard/GetTasks`;
      console.log("🌐 API URL:", url);
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("📡 Response status:", res.status);
      console.log("📡 Response ok:", res.ok);
      
      const data = await res.json();
      console.log("📊 Raw API data:", data);
      console.log("📊 Data length:", data?.length);
      
      const normalized = data.map(normalizeKeys);
      console.log("🔄 Normalized data:", normalized);
      
      setAllTasks(normalized);
      filterAndGroupTasks(normalized, searchQuery);
    } catch (err) {
      console.error("❌ Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  };

  const filterAndGroupTasks = (taskList, query) => {
    console.log("🔍 Filtering tasks with query:", query);
    console.log("📋 Task list to filter:", taskList);
    console.log("👤 Current loggedInUserId:", loggedInUserId);
    console.log("👤 loggedInUserId type:", typeof loggedInUserId);
    
    const lowerQuery = query.toLowerCase();
    
    // First, let's see if we have any tasks assigned to current user
    const userTasks = taskList.filter((task) => {
      const userIdMatch = Number(task.assignedToUserId) === Number(loggedInUserId);
      console.log(`🔍 Checking task "${task.title}": assignedTo=${task.assignedToUserId} vs logged=${loggedInUserId}, match=${userIdMatch}`);
      return userIdMatch;
    });
    
    console.log("👤 Tasks assigned to current user:", userTasks.length);
    
    // If no tasks assigned to current user, show all tasks (for admin/debugging)
    const tasksToFilter = userTasks.length > 0 ? userTasks : taskList;
    console.log("📋 Using task list:", tasksToFilter.length > 0 ? "user tasks" : "all tasks");
    
    const filtered = tasksToFilter.filter((task) => {
      const titleMatch = task.title.toLowerCase().includes(lowerQuery);
      const nameMatch = (task.assignedToFullName || "").toLowerCase().includes(lowerQuery);
      
      console.log(`📝 Task "${task.title}":`, {
        taskUserId: task.assignedToUserId,
        loggedUserId: loggedInUserId,
        titleMatch,
        nameMatch,
        overallMatch: titleMatch || nameMatch
      });
      
      return titleMatch || nameMatch;
    });

    console.log("✅ Filtered tasks:", filtered);

    const grouped = { todo: [], inProgress: [], done: [] };
    filtered.forEach((task) => {
      const status = task.status.toLowerCase();
      console.log(`📊 Grouping task "${task.title}" with status "${status}"`);
      
      if (status === "todo") grouped.todo.push(task);
      else if (status === "inprogress") grouped.inProgress.push(task);
      else if (status === "done") grouped.done.push(task);
      else console.warn(`⚠️ Unknown status: ${status}`);
    });

    console.log("📊 Final grouped tasks:", grouped);
    setTasks(grouped);
  };

  const fetchUsers = async () => {
    console.log("👥 Fetching users...");
    try {
      const token = localStorage.getItem("jwt");
      const url = `${API_BASE_URL}/user`;
      console.log("🌐 Users API URL:", url);
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("📡 Users response status:", res.status);
      const data = await res.json();
      console.log("👥 Raw users data:", data);
      
      const normalized = data.map(normalizeKeys);
      console.log("👥 Normalized users:", normalized);
      setUsers(normalized);
    } catch (err) {
      console.error("❌ Failed to fetch users", err);
    }
  };

  const handleSubmit = async () => {
    console.log("💾 Submitting task:", { editMode, newTask });
    
    if (!isFormValid || isNaN(parseInt(newTask.assignedToUserId))) {
      alert("Please select a valid assignee.");
      return;
    }

    const method = editMode ? "PUT" : "POST";
    const url = editMode
      ? `${API_BASE_URL}/TaskBoard/${editTaskId}`
      : `${API_BASE_URL}/TaskBoard/CreateTask`;

    const payload = {
      ...newTask,
      assignedToUserId: parseInt(newTask.assignedToUserId),
      status: newTask.status.toLowerCase()
    };

    console.log("📤 Payload:", payload);
    console.log("🌐 URL:", url);

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      console.log("📡 Submit response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Submit error:", errorText);
        throw new Error(`Request failed: ${res.status} - ${errorText}`);
      }

      console.log("✅ Task submitted successfully");
      resetModal();
      fetchTasks();
    } catch (err) {
      console.error("❌ Failed to submit task", err);
      alert(`Failed to ${editMode ? 'update' : 'create'} task: ${err.message}`);
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

    console.log("🗑️ Deleting task:", id);

    try {
      const token = localStorage.getItem("jwt");
      const url = `${API_BASE_URL}/TaskBoard/${id}`;
      console.log("🌐 Delete URL:", url);
      
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("📡 Delete response status:", res.status);
      
      if (res.ok) {
        console.log("✅ Task deleted successfully");
        fetchTasks();
      } else {
        const errorText = await res.text();
        console.error("❌ Delete error:", errorText);
        alert(`Failed to delete task: ${res.status} - ${errorText}`);
      }
    } catch (err) {
      console.error("❌ Delete failed", err);
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    console.log("🔄 Changing task status:", { taskId, newStatus });
    
    const task = Object.values(tasks).flat().find((t) => t.id === taskId);
    if (!task) {
      console.error("❌ Task not found:", taskId);
      return;
    }

    const updatedTask = { 
      ...task, 
      status: newStatus,
      title: task.title,
      description: task.description || "",
      assignedToUserId: task.assignedToUserId
    };

    console.log("📤 Status update payload:", updatedTask);

    try {
      const token = localStorage.getItem("jwt");
      const url = `${API_BASE_URL}/TaskBoard/${taskId}`;
      console.log("🌐 Status update URL:", url);
      
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updatedTask)
      });

      console.log("📡 Status update response:", res.status);

      if (res.ok) {
        console.log("✅ Status updated successfully");
        fetchTasks();
      } else {
        const errorText = await res.text();
        console.error("❌ Status update error:", errorText);
        alert(`Failed to update status: ${res.status} - ${errorText}`);
      }
    } catch (err) {
      console.error("❌ Status update failed", err);
      alert(`Status update failed: ${err.message}`);
    }
  };

  const resetModal = () => {
    setModalOpen(false);
    setEditMode(false);
    setEditTaskId(null);
    setNewTask({ title: "", description: "", assignedToUserId: "", status: "todo" });
  };

  const renderColumn = (colId, title, color) => {
    console.log(`🏛️ Rendering column "${title}" with ${tasks[colId]?.length || 0} tasks`);
    
    return (
      <div className="col-lg-4 col-md-6 mb-4" key={colId}>
        <div className="card shadow-sm h-100">
          <div className={`card-header ${color} text-white text-center`}>
            <h6 className="mb-0">{title} ({tasks[colId]?.length || 0})</h6>
          </div>
          <div className="card-body" style={{ minHeight: "200px" }}>
            {tasks[colId]?.length === 0 ? (
              <p className="text-muted text-center">No tasks in this column</p>
            ) : (
              tasks[colId]?.map((task) => (
                <div key={task.id} className="card border shadow-sm mb-3 p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="mb-0 text-primary">#{task.id} - {task.title}</h6>
                    <span className={`badge ${
                      task.status === 'todo' ? 'bg-info' : 
                      task.status === 'inprogress' ? 'bg-warning' : 'bg-success'
                    } text-dark`}>
                      {task.status}
                    </span>
                  </div>
                  
                  <p className="mb-2 text-muted small">{task.description}</p>
                  
                  <div className="mb-2">
                    <strong className="text-dark">👤 Assigned to:</strong>
                    <div className="text-muted small">
                      {task.assignedToFullName} (ID: {task.assignedToUserId})
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <strong className="text-dark">📅 Created:</strong>
                    <div className="text-muted small">
                      {new Date(task.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  {task.updatedAt && (
                    <div className="mb-2">
                      <strong className="text-dark">🔄 Updated:</strong>
                      <div className="text-muted small">
                        {new Date(task.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label className="form-label small"><strong>Status:</strong></label>
                    <select
                      className="form-control form-control-sm"
                      value={task.status.toLowerCase()}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    >
                      <option value="todo">To Do</option>
                      <option value="inprogress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-sm btn-outline-primary flex-fill" 
                      onClick={() => handleEdit(task)}
                    >
                      <i className="fa fa-edit"></i> Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger flex-fill" 
                      onClick={() => handleDelete(task.id)}
                    >
                      <i className="fa fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="main_content" className="font-muli theme-blush">
      {loading && <div className="page-loader-wrapper"><div className="loader" /></div>}
      <HeaderTop />
      <RightSidebar />
      <LeftSidebar />
      
      <div className="section-wrapper">
        <div className="page admin-dashboard">
        <div className="section-body mt-3 pt-0">
          <div className="container-fluid">
            <div className="jumbotron bg-light rounded shadow-sm mb-3 welcome-card dashboard-hero">
                          <h2 className="page-title text-primary pt-0 dashboard-hero-title">
                           <i class="fa-solid fa-list-alt"></i> Taskboard
                          </h2>
                          <p className="text-muted mb-0 dashboard-hero-sub">
                            Manage your tasks efficiently with a visual board
                          </p>
                        </div>
              <div className="d-flex gap-2 align-items-center" style={{ gap: '0.75rem' }} >
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
