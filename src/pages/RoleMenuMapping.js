import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import API_BASE_URL from "../config";
import RightSidebar from "../components/RightSidebar";
import LeftSidebar from "../components/LeftSidebar";
import HeaderTop from "../components/HeaderTop";
import Footer from "../components/Footer";

const RoleMenu_API = `${API_BASE_URL}/rolemenu`;

function RoleMenuMapping() {
  const [roles, setRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // ✅ Fetch roles
  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${RoleMenu_API}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching roles", err);
    }
  };

  // ✅ Fetch menus
  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${RoleMenu_API}/menus`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMenus(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching menus", err);
    }
  };

  // ✅ Fetch mappings
  const fetchMappings = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${RoleMenu_API}/rolemenumappings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMappings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching mappings", err);
    }
  };

  // ✅ Fetch details for edit
  const fetchMappingDetails = async (roleId) => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${RoleMenu_API}/rolemenumapping/${roleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch mapping details");
      const data = await res.json();

      setSelectedRole(data.role.roleId);
      const selectedIds = data.menus.map((m) => m.menuId);
      setSelectedMenus(selectedIds);

      setEditMode(true);
      setShowModal(true);
    } catch (err) {
      console.error("Error fetching mapping details", err);
      toast.error("Error fetching mapping details");
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchMenus();
    fetchMappings();
  }, []);

  const handleMenuChange = (menuId) => {
    setSelectedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const openModal = (map = null) => {
    if (map) {
      fetchMappingDetails(map.roleId);
    } else {
      setEditMode(false);
      setSelectedRole("");
      setSelectedMenus([]);
      setShowModal(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }
    if (selectedMenus.length === 0) {
      toast.error("Please select at least one menu");
      return;
    }

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${RoleMenu_API}/rolemenumapping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roleId: parseInt(selectedRole),
          menuIds: selectedMenus.join(","),
        }),
      });

      if (!res.ok) throw new Error("Failed to save mapping");

      toast.success(editMode ? "Mapping updated!" : "Mapping added!");
      setShowModal(false);
      setSelectedRole("");
      setSelectedMenus([]);
      fetchMappings();
    } catch (err) {
      console.error("Error saving mapping", err);
      toast.error("Error saving mapping");
    }
  };

  const handleDelete = async (roleId) => {
    if (!window.confirm("Are you sure you want to delete this mapping?")) return;
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${RoleMenu_API}/rolemenumapping/${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete mapping");

      toast.success("Mapping deleted successfully!");
      fetchMappings();
    } catch (err) {
      console.error("Error deleting mapping", err);
      toast.error("Error deleting mapping");
    }
  };

  return (
    <div id="main_content" className="font-muli theme-blush">
      <HeaderTop />
      <RightSidebar />
      <LeftSidebar />

      <div className="page">
        <div className="section-body mt-3">
          <div className="container-fluid">
            {/* Jumbotron Header */}
            <div className="jumbotron bg-light p-4 rounded shadow-sm mb-4 welcome-card animate-welcome">
              <h2 className="page-title text-primary">
                <i className="fa-solid fa-diagram-project"></i> Role Menu Mapping
              </h2>
              <p className="text-muted mb-0">
                Assign menus to roles and manage mappings
              </p>
            </div>

            {/* Card Section */}
            <div className="card shadow-sm mb-4">
              <div
                className="card-header bg-primary text-white d-flex"
                style={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "15px",
                }}
              >
                <h6 className="mb-0">
                  <i className="fa fa-list mr-2"></i> Role Menu Mapping
                </h6>
                <button className="btn btn-light btn-sm" onClick={() => openModal()}>
                  <i className="fa fa-plus"></i> Add Mapping
                </button>
              </div>

              <div className="card-body">
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Menus</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.length > 0 ? (
                      mappings.map((map) => (
                        <tr key={map.roleId}>
                          <td>{map.roleName}</td>
                          <td>{map.menus || "-"}</td>
                          <td>
                            <button
                              className="btn btn-warning btn-sm me-2"
                              onClick={() => openModal(map)}
                            >
                              <i className="fa fa-edit"></i> Edit
                            </button>
                            {/* <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(map.roleId)}
                            >
                              <i className="fa fa-trash"></i> Delete
                            </button> */}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="text-center">
                          No mappings found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        size="lg"
      >
        <Modal.Header>
          <Modal.Title>
            {editMode ? "Edit Mapping" : "Assign Menus to Role"}
          </Modal.Title>
          <button className="close" onClick={() => setShowModal(false)}>
            <span>&times;</span>
          </button>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label><b>Select Role</b></label>
              <select
                className="form-control"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                required
                disabled={editMode}
              >
                <option value="">-- Select Role --</option>
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleName}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label><b>Select Menus</b></label>
              <div
                className="border rounded p-2"
                style={{ maxHeight: "250px", overflowY: "auto" }}
              >
                {menus.map((m) => (
                  <div key={m.menuId} className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`menu-${m.menuId}`}
                      checked={selectedMenus.includes(m.menuId)}
                      onChange={() => handleMenuChange(m.menuId)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`menu-${m.menuId}`}
                    >
                      {m.menuName}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-end">
              <button type="submit" className="btn btn-success">
                {editMode ? "Update Mapping" : "Save Mapping"}
              </button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default RoleMenuMapping;
