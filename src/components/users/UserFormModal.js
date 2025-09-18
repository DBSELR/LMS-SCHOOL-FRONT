import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";

function UserFormModal({ isOpen, onClose, user, onSave }) {
  const [formData, setFormData] = useState({
    // username/password kept in state but NOT shown in UI
    username: "",
    password: "",
    role: "Admin",
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "Male",
    address: ""
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        password: "",
        role: user.role || "Admin",
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phoneNumber: user.phoneNumber || "",
        dateOfBirth: user.dateOfBirth || "",
        gender: user.gender || "Male",
        address: user.address || ""
      });
    } else {
      setFormData({
        username: "",
        password: "",
        role: "Admin",
        email: "",
        firstName: "",
        lastName: "",
        phoneNumber: "",
        dateOfBirth: "",
        gender: "Male",
        address: ""
      });
    }
  }, [user, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // optional: keep phone numeric only
    if (name === "phoneNumber") {
      const digits = value.replace(/\D/g, "").slice(0, 15);
      setFormData((prev) => ({ ...prev, [name]: digits }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const isCreate = !user;

    // Basic client-side checks (no username/password checks anymore)
    if (!formData.email?.trim()) {
      toast.error("Email is required.");
      return;
    }

    // Build safe endpoint (avoid '/api/api' duplicates)
    const base = String(API_BASE_URL || "").replace(/\/+$/, "");
    const endpoint = isCreate
      ? (/\/api$/i.test(base) ? `${base}/User` : `${base}/api/User`)
      : (/\/api$/i.test(base) ? `${base}/User/${user.userId}` : `${base}/api/User/${user.userId}`);

    const method = isCreate ? "POST" : "PUT";

    // Build payload without username/password by default
    const payloadBase = {
      role: formData.role,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      address: formData.address
    };

    // For create: include placeholders to satisfy backend [Required] (server will auto-generate anyway)
    const payload = isCreate
      ? {
          ...payloadBase,
          username: "TEMPUSER",
          password: "TempP@ssw0rd!"
        }
      : payloadBase;

    console.group("📦 Sending User request");
    console.log("➤ Method:", method);
    console.log("➤ URL:", endpoint);
    console.table(payload);
    console.groupEnd();

    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      if (!response.ok) {
        console.error(`❌ API Error (${response.status}):`, text);
        toast.error("❌ Failed to save user. See console for details.");
        return;
        }

      // Optionally parse
      try {
        if (text) JSON.parse(text);
      } catch {
        /* non-JSON OK */
      }

      toast.success(isCreate ? "✅ User created!" : "✅ User updated!");
      onClose();
      onSave && onSave();
    } catch (err) {
      console.error("🔥 Request failed:", err);
      toast.error("❌ Network or server error. See console.");
    }
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>{user ? "Edit User" : "Add New User"}</Modal.Title>
        <button type="button" className="close" onClick={onClose}>
          <span>&times;</span>
        </button>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Row>
            {/* Username & Password are intentionally HIDDEN (auto-generated server-side). */}

            <Col md={6}>
              <Form.Group>
                <Form.Label>Role</Form.Label>
                <Form.Control
                  as="select"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option>Admin</option>
                  <option>SRO</option>
                  <option>Business_Executive</option>
                </Form.Control>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Email</Form.Label>
                <Form.Control
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>First Name</Form.Label>
                <Form.Control
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Last Name</Form.Label>
                <Form.Control
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Date of Birth</Form.Label>
                <Form.Control
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Gender</Form.Label>
                <Form.Control
                  as="select"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </Form.Control>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label>Address</Form.Label>
                <Form.Control
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          {user ? "Update" : "Create"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default UserFormModal;
