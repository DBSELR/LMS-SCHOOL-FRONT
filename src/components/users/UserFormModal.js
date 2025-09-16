import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";

function UserFormModal({ isOpen, onClose, user, onSave }) {
  const [formData, setFormData] = useState({
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

const handleSubmit = async () => {
  console.log("🚀 Submitting user form...");
  console.log("📋 Form data before validation:", formData);

  if (!formData.username || (!user && !formData.password)) {
    console.warn("⚠️ Validation failed: missing username or password.");
    alert("Username and Password are required.");
    return;
  }

  const endpoint = user
    ? `${API_BASE_URL}/User/${user.userId}`
    : `${API_BASE_URL}/User`;

  const method = user ? "PUT" : "POST";

  const payload = {
    username: formData.username,
    password: formData.password,
    role: formData.role,
    email: formData.email,
    firstName: formData.firstName,
    lastName: formData.lastName,
    phoneNumber: formData.phoneNumber,
    dateOfBirth: formData.dateOfBirth,
    gender: formData.gender,
    address: formData.address
  };

  console.log(`📦 Sending ${method} request to ${endpoint}`);
  console.log("📦 Payload:", payload);

  try {
    const token = localStorage.getItem("jwt");
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error (${response.status}):`, errorText);
      toast.error("❌ Failed to save user. See console for details.");
      return;
    }

    console.log("✅ API request successful");
    toast.success(user ? "✅ User updated!" : "✅ User created!");
    onClose();
    onSave();
  } catch (err) {
    console.error("🔥 Request failed:", err);
    toast.error("❌ Network or server error. See console.");
  }
};


  return (
    <Modal show={isOpen} onHide={onClose} size="lg" >
      <Modal.Header >
        <Modal.Title>{user ? "Edit User" : "Add New User"}</Modal.Title>
       <button
                    type="button"
                    className="close"
                    onClick={onClose}
                  >
                    <span>&times;</span>
                  </button>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Username</Form.Label>
                <Form.Control
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            {!user && (
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            )}
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
