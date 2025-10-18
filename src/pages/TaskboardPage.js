import React, { useEffect, useMemo, useState } from "react";
import HeaderTop from "../components/HeaderTop";
import RightSidebar from "../components/RightSidebar";
import LeftSidebar from "../components/LeftSidebar";
import Footer from "../components/Footer";
import ConfirmationPopup from "../components/ConfirmationPopup";
import { jwtDecode } from "jwt-decode";
import API_BASE_URL from "../config";

/** ---- tiny helpers ---- */
const toCamel = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const normalizeKeys = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [toCamel(k), v]));
const STATUS_META = {
  todo: { label: "To Do", badge: "bg-info", header: "bg-info" },
  inprogress: { label: "In Progress", badge: "bg-warning", header: "bg-warning" },
  done: { label: "Done", badge: "bg-success", header: "bg-success" },
};

function TaskboardPage() {
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Add custom styles
  const customStyles = `
    .task-card {
      transition: all 0.2s ease-in-out;
      border-radius: 12px !important;
    }
    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
    }
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .bg-gradient {
      border-radius: 15px !important;
    }
    .form-control:focus, .form-select:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px;
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      transform: translateY(-1px);
    }
    .modal-content {
      border-radius: 15px !important;
    }
    .task-list {
      max-height: 70vh;
      overflow-y: auto;
      padding-right: 5px;
    }
    .task-list::-webkit-scrollbar {
      width: 6px;
    }
    .task-list::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    .task-list::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 10px;
    }
    .task-list::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
    .card {
      border-radius: 12px !important;
    }
    .input-group-text {
      border-radius: 8px 0 0 8px !important;
    }
    .form-control {
      border-radius: 0 8px 8px 0 !important;
    }
    .form-select {
      border-radius: 8px !important;
    }
    .btn {
      border-radius: 8px !important;
    }
    .badge {
      border-radius: 20px !important;
    }
    
    /* Enhanced Custom Filter Select */
    .custom-filter-select {
      appearance: none;
      background-image: none;
      cursor: pointer;
      position: relative;
    }
    
    .custom-filter-select:focus {
      border-color: #667eea !important;
      box-shadow: 0 0 0 0.25rem rgba(102, 126, 234, 0.15) !important;
      transform: translateY(-1px);
    }
    
    .custom-filter-select:hover {
      border-color: #b8c5ea;
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    
    /* Style for dropdown options */
    .custom-filter-select option {
      padding: 12px 16px;
      font-weight: 600;
      color: #495057;
      background: #ffffff;
      border: none;
    }
    
    .custom-filter-select option:hover {
      background: #f8f9fa;
    }
    
    /* Custom dropdown arrow animation */
    .custom-filter-select:focus + .position-absolute i {
      transform: rotate(180deg);
      transition: transform 0.3s ease;
    }
    
    /* Enhanced styling for different states */
    .custom-filter-select[value="all"] {
      background: linear-gradient(135deg, #667eea 5%, #ffffff 5%);
      border-left: 4px solid #667eea;
    }
    
    .custom-filter-select[value="todo"] {
      background: linear-gradient(135deg, #0dcaf0 5%, #ffffff 5%);
      border-left: 4px solid #0dcaf0;
    }
    
    .custom-filter-select[value="inprogress"] {
      background: linear-gradient(135deg, #ffc107 5%, #ffffff 5%);
      border-left: 4px solid #ffc107;
    }
    
    .custom-filter-select[value="done"] {
      background: linear-gradient(135deg, #198754 5%, #ffffff 5%);
      border-left: 4px solid #198754;
    }
    
    /* Dropdown animation */
    .custom-filter-select {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
      /* Enhanced label styling */
    .form-label {
      color: #495057 !important;
      font-weight: 700 !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px !important;
    }
    
    /* Admin badge styling */
    .admin-badge {
      animation: pulse-admin 2s infinite;
    }
    
    @keyframes pulse-admin {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }    /* Responsive adjustments */
    @media (max-width: 768px) {
      .custom-filter-select {
        padding: 10px 14px;
        font-size: 13px;
      }
    }
  `;

  // raw + grouped
  const [allTasks, setAllTasks] = useState([]);
  const [tasks, setTasks] = useState({ todo: [], inProgress: [], done: [] });

  // ui state
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);
  const [users, setUsers] = useState([]);

  // filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all|todo|inprogress|done

  // delete confirm
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // form
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedToUserId: "",
    status: "todo",
  });

  const isFormValid =
    newTask.title.trim() !== "" &&
    newTask.description.trim() !== "" &&
    newTask.assignedToUserId !== "";

  /** ===== init: read user from JWT ===== */
  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) return;
    try {
      const d = jwtDecode(token);
      const userId =
        d["UserId"] || d.userId || d["user_id"] || d.id || d.sub;
      const finalUserId = !isNaN(Number(userId)) ? Number(userId) : userId;
      
      // Check user role - adjust these field names based on your JWT structure
      const role = d["role"] || d["Role"] || d["userRole"] || d["UserRole"] || "";
      const adminRoles = ["admin", "administrator", "Admin", "Administrator", "ADMIN"];
      const isUserAdmin = adminRoles.some(adminRole => 
        role.toLowerCase().includes(adminRole.toLowerCase())
      );
      
      setLoggedInUserId(finalUserId);
      setUserRole(role);
      setIsAdmin(isUserAdmin);
    } catch {
      // ignore
    }
  }, []);

  /** ===== load tasks + users once we know user ===== */
  useEffect(() => {
    if (!loggedInUserId || userRole === null) return;
    (async () => {
      await Promise.all([fetchTasks(), fetchUsers()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInUserId, isAdmin]);

  /** ===== derive filtered/grouped tasks ===== */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Show all tasks
    const base = allTasks;

    return base
      .filter((t) => {
        if (statusFilter !== "all" && t.status?.toLowerCase() !== statusFilter)
          return false;
        if (!q) return true;
        const name =
          `${t.assignedToFullName || ""}`.toLowerCase();
        return (
          t.title?.toLowerCase().includes(q) ||
          name.includes(q) ||
          String(t.id || "").includes(q)
        );
      })
      .sort((a, b) => {
        // simple sort: newer first by updatedAt/createdAt
        const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      });
  }, [allTasks, searchQuery, statusFilter]);

  useEffect(() => {
    const grouped = { todo: [], inProgress: [], done: [] };
    filtered.forEach((t) => {
      const s = (t.status || "").toLowerCase();
      if (s === "todo") grouped.todo.push(t);
      else if (s === "inprogress") grouped.inProgress.push(t);
      else if (s === "done") grouped.done.push(t);
    });
    setTasks(grouped);
  }, [filtered]);

  /** ====== api ====== */
  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("jwt");
      
      // For admin users, pass UserId as 0 or a special value to get all tasks
      // For regular users, pass their actual UserId to get only their tasks
      const userIdParam = isAdmin ? 0 : loggedInUserId;
      
      const url = `${API_BASE_URL}/TaskBoard/GetTasks?UserId=${userIdParam}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) || [];
      setAllTasks(data.map(normalizeKeys));
    } catch (e) {
      console.error("Fetch tasks failed", e);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) || [];
      setUsers(data.map(normalizeKeys));
    } catch (e) {
      console.error("Fetch users failed", e);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid || isNaN(parseInt(newTask.assignedToUserId))) return;

    const method = editMode ? "PUT" : "POST";
    const url = editMode
      ? `${API_BASE_URL}/TaskBoard/${editTaskId}`
      : `${API_BASE_URL}/TaskBoard/CreateTask`;

    const payload = {
      ...newTask,
      assignedToUserId: parseInt(newTask.assignedToUserId),
      status: newTask.status.toLowerCase(),
    };

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      resetModal();
      await fetchTasks();
    } catch (e) {
      console.error("Submit failed", e);
    }
  };

  const handleEdit = (task) => {
    setEditMode(true);
    setEditTaskId(task.id);
    const match = users.some(
      (u) => String(u.userId) === String(task.assignedToUserId)
    );
    setNewTask({
      title: task.title || "",
      description: task.description || "",
      assignedToUserId: match ? String(task.assignedToUserId) : "",
      status: (task.status || "todo").toLowerCase(),
    });
    setModalOpen(true);
  };

  const requestDelete = (id) => {
    setPendingDeleteId(id);
    setShowConfirmPopup(true);
  };

  const handleDeleteConfirmed = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/TaskBoard/${pendingDeleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setShowConfirmPopup(false);
      setPendingDeleteId(null);
      await fetchTasks();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    const updatedTask = {
      ...task,
      status: newStatus,
      title: task.title,
      description: task.description || "",
      assignedToUserId: task.assignedToUserId,
    };
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/TaskBoard/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedTask),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchTasks();
    } catch (e) {
      console.error("Status update failed", e);
    }
  };

  /** ===== ui helpers ===== */
  const resetModal = () => {
    setModalOpen(false);
    setEditMode(false);
    setEditTaskId(null);
    setNewTask({
      title: "",
      description: "",
      assignedToUserId: "",
      status: "todo",
    });
  };

  const EmptyState = ({ title, hint }) => (
    <div className="text-center py-5 px-3">
      <div className="mb-3">
        <div 
          className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light"
          style={{ width: 80, height: 80, fontSize: 32 }}
        >
          �
        </div>
      </div>
      <h6 className="fw-semibold text-muted mb-2">{title}</h6>
      {hint && <p className="text-secondary small mb-0 lh-base">{hint}</p>}
    </div>
  );

  const SkeletonCard = () => (
    <div className="card border-0 shadow-sm mb-3 bg-light" style={{ opacity: 0.6 }}>
      <div className="card-body p-3">
        <div className="placeholder-glow">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <span className="placeholder col-7 rounded-pill"></span>
            <span className="placeholder col-3 rounded-pill"></span>
          </div>
          <span className="placeholder col-12 mb-2"></span>
          <span className="placeholder col-8 mb-3"></span>
          <div className="d-flex gap-2">
            <span className="placeholder col-4 rounded"></span>
            <span className="placeholder col-3 rounded"></span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCard = (task) => {
    const s = (task.status || "").toLowerCase();
    const meta = STATUS_META[s] || STATUS_META.todo;
    return (
      <div key={task.id} className="card border-0 shadow-sm mb-3 task-card position-relative overflow-hidden">
        {/* Status indicator line */}
        <div className={`position-absolute top-0 start-0 w-100 ${meta.header}`} style={{ height: '4px' }}></div>
        
        <div className="card-body p-3">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className="flex-grow-1 me-2 mr-10">
              <h6 className="mb-1 fw-bold text-dark">
                {task.title}
              </h6>
              <small className="text-muted">
                <i className="fa fa-hashtag me-1" style={{ fontSize: '10px' }} />
                Task ID: {task.id}
              </small>
            </div>
            <span className={`badge ${meta.badge} px-3 py-2 fw-normal`} style={{ fontSize: '11px' }}>
              {meta.label}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <div className="mb-3">
              <p className="mb-0 text-muted small lh-base" style={{ 
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {task.description}
              </p>
            </div>
          )}

          {/* Meta info */}
          <div className="mb-3">
            <div className="row g-2 small text-muted">
              <div className="col-12">
                <div className="d-flex align-items-center">
                  <i className="fa fa-user-circle me-2 mr-10 text-primary" />
                  <span className="fw-medium">
                    {task.assignedToFullName || `User ${task.assignedToUserId}`}
                  </span>
                </div>
              </div>
              <div className="col-6">
                <div className="d-flex align-items-center">
                  <i className="fa fa-calendar-plus me-2 mr-10 text-success" style={{ fontSize: '12px' }} />
                  <span title={task.createdAt ? new Date(task.createdAt).toLocaleString() : "-"}>
                    {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "-"}
                  </span>
                </div>
              </div>
              {task.updatedAt && (
                <div className="col-6">
                  <div className="d-flex align-items-center">
                    <i className="fa fa-sync me-2 mr-10 text-warning" style={{ fontSize: '12px' }} />
                    <span title={new Date(task.updatedAt).toLocaleString()}>
                      {new Date(task.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="d-flex flex-column gap-3">
            {/* Status buttons */}
            <div className="d-flex gap-2 w-100" role="group">
              <button
                className={`btn btn-sm ${s === "todo" ? "btn-info" : "btn-outline-info"} flex-fill`}
                onClick={() => handleStatusChange(task, "todo")}
                title="Move to To Do"
              >
                <i className="fa fa-list-ul me-1" />
                To Do
              </button>
              <button
                className={`btn btn-sm ${s === "inprogress" ? "btn-warning" : "btn-outline-warning"} flex-fill`}
                onClick={() => handleStatusChange(task, "inprogress")}
                title="Move to In Progress"
              >
                <i className="fa fa-play me-1" />
                Progress
              </button>
              <button
                className={`btn btn-sm ${s === "done" ? "btn-success" : "btn-outline-success"} flex-fill`}
                onClick={() => handleStatusChange(task, "done")}
                title="Move to Done"
              >
                <i className="fa fa-check me-1" />
                Done
              </button>
            </div>
            
            {/* Edit/Delete buttons */}
            <div className="d-flex gap-2">
              <button 
                className="btn btn-sm btn-outline-primary flex-fill" 
                onClick={() => handleEdit(task)}
                title="Edit task"
              >
                <i className="fa fa-edit me-1" />
                Edit
              </button>
              <button 
                className="btn btn-sm btn-outline-danger flex-fill" 
                onClick={() => requestDelete(task.id)}
                title="Delete task"
              >
                <i className="fa fa-trash me-1" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderColumn = (colId, titleKey, headerColor) => {
    const list =
      colId === "todo"
        ? tasks.todo
        : colId === "inProgress"
        ? tasks.inProgress
        : tasks.done;

    const getColumnIcon = (colId) => {
      switch(colId) {
        case 'todo': return 'fa-list-ul';
        case 'inProgress': return 'fa-play-circle';
        case 'done': return 'fa-check-circle';
        default: return 'fa-tasks';
      }
    };

    // Determine column width based on filter
    const getColumnWidth = () => {
      if (statusFilter === "all") {
        return "col-12 col-lg-4"; // 3 columns layout
      } else {
        return "col-12"; // Full width when filtered
      }
    };

    return (
      <div className={`${getColumnWidth()} mb-4`} key={colId}>
        <div className="card border-0 shadow-sm h-100">
          <div className={`card-header ${headerColor} text-white border-0 py-3`}>
            <div className="d-flex justify-content-between align-items-center w-100">
              <div className="d-flex align-items-center">
                <i className={`fa ${getColumnIcon(colId)} me-2 mr-10 fs-5`} />
                <h5 className="mb-0 fw-bold">{titleKey}</h5>
              </div>
              <span className="badge bg-white bg-opacity-75 text-black fw-semibold px-3 py-2" style={{color:'#000'}}>
                {list?.length || 0} {list?.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
          </div>
          <div className="card-body p-3" style={{ minHeight: 400, backgroundColor: '#fafbfc' }}>
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : !list || list.length === 0 ? (
              <EmptyState 
                title="No tasks yet" 
                hint={colId === 'todo' ? "Click 'New Task' to get started" : "Drag tasks here or change their status"} 
              />
            ) : (
              <div className="task-list">
                {list.map(renderCard)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="main_content" className="font-muli theme-blush">
      {/* Inject custom styles */}
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      
      {/* optional page loader */}
      {loading && (
        <div className="page-loader-wrapper">
          <div className="loader" />
        </div>
      )}

      <HeaderTop />
      <RightSidebar />
      <LeftSidebar />

      <div className="section-wrapper">
        <div className="page admin-dashboard">
          <div className="section-body mt-3 pt-0">
            <div className="container-fluid">
              {/* hero */}
              <div className="card border-0 shadow-sm mb-4 bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="card-body p-4 text-white">
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <h1 className="mb-2 fw-bold hero-title">
                        <i className="fa-solid fa-list-check me-3 hero-icon" />
                        Task Management Board
                      </h1>
                      <p className="mb-0 opacity-90 hero-subtitle">
                        Organize, prioritize, and track your team's progress with our intuitive Kanban board
                      </p>
                    </div>
                    <div className="col-md-4 text-md-end text-center mt-3 mt-md-0">
                      <div className="d-flex flex-column align-items-end align-items-center align-items-md-end gap-2">
                        {isAdmin && (
                          <div className="d-inline-flex align-items-center bg-success bg-opacity-20 rounded-pill px-3 py-1 admin-badge" style={{color:'#198754'}}>
                            <i className="fa fa-shield-alt me-2" style={{fontSize: '0.8rem'}} />
                            <span className="fw-bold" style={{fontSize: '0.8rem'}}>Admin Access - All Tasks</span>
                          </div>
                        )}
                        <div className="d-inline-flex align-items-center bg-white bg-opacity-20 rounded-pill px-3 py-2 hero-badge" style={{color:'#000'}}>
                          <i className="fa fa-tasks me-2" />
                          <span className="fw-semibold">
                            {allTasks.length} {isAdmin ? "Total Tasks" : "My Tasks"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* toolbar */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4" style={{margin:'auto', alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                  <div className="row g-3 align-items-center">
                    {/* Search Section */}
                    <div className="col-lg-4 col-md-6">
                      <label className="form-label fw-semibold mb-2 text-muted small text-uppercase">
                        <i className="fa fa-search me-1" /> Search Tasks
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="fa fa-search text-muted" />
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0 ps-0"
                          placeholder="Search by title, assignee, or #ID"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button 
                            className="btn btn-outline-secondary border-start-0"
                            onClick={() => setSearchQuery("")}
                            title="Clear search"
                          >
                            <i className="fa fa-times" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filter Section */}
                    <div className="col-lg-4 col-md-6">
                      <label className="form-label fw-semibold mb-2 text-muted small text-uppercase">
                        <i className="fa fa-filter me-2" /> Status Filter
                      </label>
                      <div className="position-relative">
                        <select
                          className="form-select form-select-lg custom-filter-select"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          style={{
                            borderRadius: '12px',
                            border: '2px solid #e9ecef',
                            padding: '12px 16px',
                            fontSize: '14px',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <option value="all" style={{ padding: '8px' }}>
                            All Statuses ({allTasks.length} tasks) 
                          </option>
                          <option value="todo" style={{ padding: '8px' }}>
                            To Do ({tasks.todo?.length || 0} tasks)
                          </option>
                          <option value="inprogress" style={{ padding: '8px' }}>
                            In Progress ({tasks.inProgress?.length || 0} tasks)
                          </option>
                          <option value="done" style={{ padding: '8px' }}>
                            Done ({tasks.done?.length || 0} tasks)
                          </option>
                        </select>
                        
                      </div>
                    </div>

                    {/* Action Section */}
                    <div className="col-lg-4 col-md-6">
                      <label className="form-label fw-semibold mb-2 text-muted small text-uppercase d-block">
                        <i className="fa fa-plus me-1" /> Actions
                      </label>
                      <button
                        className="btn btn-primary w-100 fw-semibold"
                        onClick={() => {
                          setEditMode(false);
                          setEditTaskId(null);
                          setNewTask({
                            title: "",
                            description: "",
                            assignedToUserId: "",
                            status: "todo",
                          });
                          setModalOpen(true);
                        }}
                      >
                        <i className="fa fa-plus me-2 mr-10" />
                        New Task
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              {!loading && allTasks.length > 0 && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body p-4">
                        <h6 className="text-muted mb-3 fw-semibold text-uppercase small">
                          <i className="fa fa-chart-bar me-2 mr-10" />
                          Task Overview
                        </h6>
                        <div className="row g-3">
                          <div className="col-6 col-md-3">
                            <div className="text-center p-3 bg-light rounded" style={{ fontWeight:'bold'}}>
                              <div className="fs-4 fw-bold">{allTasks.length}</div>
                              <div className="small" style={{fontWeight:'bold'}}>Total Tasks</div>
                            </div>
                          </div>
                          <div className="col-6 col-md-3">
                            <div className="text-center p-3 bg-info bg-opacity-10 rounded" style={{color:'#fff', fontWeight:'bold'}}>
                              <div className="fs-4 fw-bold ">{tasks.todo?.length || 0}</div>
                              <div className="small" style={{color:'#fff', fontWeight:'bold'}}>To Do</div>
                            </div>
                          </div>
                          <div className="col-6 col-md-3">
                            <div className="text-center p-3 bg-warning bg-opacity-10 rounded" style={{color:'#000', fontWeight:'bold'}}>
                              <div className="fs-4 fw-bold ">{tasks.inProgress?.length || 0}</div>
                              <div className="small" style={{color:'#000', fontWeight:'bold'}}>In Progress</div>
                            </div>
                          </div>
                          <div className="col-6 col-md-3">
                            <div className="text-center p-3 bg-success bg-opacity-10 rounded" style={{color:'#fff', fontWeight:'bold'}}>
                              <div className="fs-4 fw-bold">{tasks.done?.length || 0}</div>
                              <div className="small" style={{color:'#fff', fontWeight:'bold'}} >Completed</div>
                            </div>
                          </div>
                        </div>
                        {allTasks.length > 0 && (
                          <div className="mt-3">
                            <div className="progress" style={{ height: '8px' }}>
                              <div 
                                className="progress-bar bg-success" 
                                role="progressbar" 
                                style={{ 
                                  width: `${Math.round((tasks.done?.length || 0) / allTasks.length * 100)}%` 
                                }}
                                title={`${Math.round((tasks.done?.length || 0) / allTasks.length * 100)}% completed`}
                              ></div>
                            </div>
                            <small className="text-muted mt-1 d-block text-center">
                              {Math.round((tasks.done?.length || 0) / allTasks.length * 100)}% of tasks completed
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* columns */}
              <div className="row g-4">
                {(statusFilter === "all" || statusFilter === "todo") && renderColumn("todo", "To Do", "bg-info")}
                {(statusFilter === "all" || statusFilter === "inprogress") && renderColumn("inProgress", "In Progress", "bg-warning")}
                {(statusFilter === "all" || statusFilter === "done") && renderColumn("done", "Done", "bg-success")}
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white border-0">
                <h4 className="modal-title fw-bold mb-0">
                  <i className={`fa ${editMode ? 'fa-edit' : 'fa-plus-circle'} me-2 mr-10`} />
                  {editMode ? "Edit Task" : "Create New Task"}
                </h4>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={resetModal} 
                  aria-label="Close"
                />
              </div>
              <div className="modal-body p-4">
                <form>
                  {/* Task Title */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold text-muted small text-uppercase mb-2">
                      <i className="fa fa-heading me-1" /> Task Title *
                    </label>
                    <input
                      className={`form-control form-control-lg ${newTask.title.trim() ? 'is-valid' : ''}`}
                      autoFocus
                      placeholder="Enter a clear, actionable task title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold text-muted small text-uppercase mb-2">
                      <i className="fa fa-align-left me-1" /> Description *
                    </label>
                    <textarea
                      className={`form-control ${newTask.description.trim() ? 'is-valid' : ''}`}
                      rows={4}
                      placeholder="Provide detailed information about the task, including acceptance criteria, requirements, or any relevant links..."
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                  </div>

                  {/* Assignee and Status Row */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-7">
                      <label className="form-label fw-semibold text-muted small text-uppercase mb-2">
                        <i className="fa fa-user me-1" /> Assignee *
                      </label>
                      <select
                        className={`form-select form-select-lg ${newTask.assignedToUserId ? 'is-valid' : ''}`}
                        value={newTask.assignedToUserId}
                        onChange={(e) => setNewTask({ ...newTask, assignedToUserId: e.target.value })}
                      >
                        <option value="">Choose team member...</option>
                        {users.map((u) => {
                          const idStr = String(u.userId);
                          return (
                            <option key={idStr} value={idStr}>
                              {u.firstName} {u.lastName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="col-md-5">
                      <label className="form-label fw-semibold text-muted small text-uppercase mb-2">
                        <i className="fa fa-flag me-1" /> Initial Status
                      </label>
                      <select
                        className="form-select form-select-lg"
                        value={newTask.status}
                        onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                      >
                        <option value="todo">📋 To Do</option>
                        <option value="inprogress">⚡ In Progress</option>
                        <option value="done">✅ Done</option>
                      </select>
                    </div>
                  </div>

                  {/* Form Validation Alert */}
                  {!isFormValid && (
                    <div className="alert alert-warning d-flex align-items-center border-0 shadow-sm" role="alert">
                      <i className="fa fa-exclamation-triangle me-3 text-warning fs-5" />
                      <div>
                        <strong>Required fields missing!</strong><br />
                        <small>Please complete all required fields: Task Title, Description, and Assignee.</small>
                      </div>
                    </div>
                  )}
                </form>
              </div>
              <div className="modal-footer bg-light border-0 p-4">
                <button 
                  className="btn btn-outline-secondary px-4" 
                  onClick={resetModal}
                >
                  <i className="fa fa-times me-1" />
                  Cancel
                </button>
                <button 
                  className="btn btn-primary px-4 fw-semibold" 
                  onClick={handleSubmit} 
                  disabled={!isFormValid}
                >
                  <i className={`fa ${editMode ? 'fa-save' : 'fa-plus'} me-2 mr-10`} />
                  {editMode ? "Update Task" : "Create Task"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmationPopup
        show={showConfirmPopup}
        title="Delete Task"
        message="Are you sure you want to permanently delete this task?"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => {
          setShowConfirmPopup(false);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}

export default TaskboardPage;
