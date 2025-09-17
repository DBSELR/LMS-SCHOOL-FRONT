// File: src/pages/Courses Ware/BatchTab.jsx
import React, { useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import { toast } from "react-toastify";

const BatchTab = () => {
  const [form, setForm] = useState({
    batchName: "",
    startDate: "",
    endDate: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSave = () => {
    const { batchName, startDate, endDate } = form;

    if (!batchName || !startDate || !endDate) {
      toast.error("Please fill Batch, Start Date, and End Date");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start Date cannot be after End Date");
      return;
    }

    // 👉 Hook your API call here if needed
    // await fetch(`${API_BASE_URL}/...`, { method: 'POST', body: JSON.stringify(form) })

    toast.success("✅ Batch saved");
    setForm({ batchName: "", startDate: "", endDate: "" });
  };

  return (
    <div className="container py-4">
      <div className="mb-4 p-4 rounded bg-glass border shadow-sm">
        <h5 className="mb-4 text-primary">Add / Edit Batch</h5>
        <Form>
          <Row className="g-3">
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label>Batch</Form.Label>
                <Form.Control
                  name="batchName"
                  placeholder="e.g., 2025-26"
                  value={form.batchName}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col xs={12} className="mt-2">
              <Button
                variant="success"
                className="rounded-pill px-4"
                onClick={handleSave}
              >
                Save
              </Button>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  );
};

export default BatchTab;
