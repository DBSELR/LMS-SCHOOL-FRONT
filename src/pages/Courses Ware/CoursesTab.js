import React, { useEffect, useState } from "react";
import { Form, Button, Collapse } from "react-bootstrap";
import { toast } from "react-toastify";
import { FaChevronDown, FaChevronUp, FaEdit, FaTrash } from "react-icons/fa";
import API_BASE_URL from "../../config";

const CoursesTab = ({ isActive }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({});
  const [form, setForm] = useState({
    batchName: "",
    courseCode: "",
    courseName: "",
    fee: "",
    courseId: null,
  });

  useEffect(() => {
    if (isActive) fetchCourses();
  }, [isActive]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Programme/All`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const normalized = data.map((course) => ({
        ...course,
        isCertCourse: course.isCertCourse ?? course.IsCertCourse ?? false,
        isNoGrp: course.isNoGrp ?? course.IsNoGrp ?? false,
      }));
      setCourses(normalized);
      console.log("Loaded Programmes:", normalized);
    } catch {
      toast.error("❌ Failed to fetch courses", { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (course) => {
    setForm({
      batchName: course.batchName ?? "",
      courseCode: course.programmeCode ?? "",
      courseName: course.programmeName ?? "",
      fee: course.fee ?? "",
      courseId: course.programmeId ?? null,
    });
  };

  const handleDelete = async (courseId) => {
    toast.dismiss();
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Programme/${courseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const errorText = await res.text();
      if (!res.ok) throw new Error(errorText || "Delete failed");

      toast.success("🗑️ Board Deleted successfully", { autoClose: 3000 });
      fetchCourses();
    } catch (err) {
      toast.error(`❌ Deletion failed: ${err.message}`, { autoClose: 3000 });
    }
  };

  const handleSaveOrUpdate = async () => {
    toast.dismiss();

    const { batchName, courseCode, courseName, fee, courseId } = form;

    if (!batchName || !courseCode || !courseName || !fee) {
      toast.error("❌ Please fill all fields", { autoClose: 3000 });
      return;
    }

    // Fixed values (not shown in UI)
    const payload = {
      programmeName: courseName,
      programmeCode: courseCode,
      numberOfSemesters: 1,       // fixed
      fee: parseFloat(fee),
      installments: 1,            // fixed
      batchName,
      isCertCourse: false,        // fixed
      isNoGrp: false,             // fixed
    };

    try {
      const token = localStorage.getItem("jwt");
      const url = courseId
        ? `${API_BASE_URL}/Programme/Update/${courseId}`
        : `${API_BASE_URL}/Programme`;
      const method = courseId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const errorText = await res.text();
      if (!res.ok) throw new Error(errorText || "Save failed");

      toast.success(`✅ Board ${courseId ? "updated" : "created"} successfully`, {
        autoClose: 3000,
      });

      setForm({
        batchName: "",
        courseCode: "",
        courseName: "",
        fee: "",
        courseId: null,
      });

      fetchCourses();
    } catch (err) {
      toast.error(`❌ Save failed: ${err.message}`, { autoClose: 3000 });
    }
  };

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="container py-4 welcome-card animate-welcome">
      <div className="mb-4 bg-glass p-4">
        <h5 className="mb-4 text-primary">Add / Edit Boards</h5>
        <Form>
          <div className="row gy-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Batch</Form.Label>
                <Form.Control
                  name="batchName"
                  value={form.batchName}
                  onChange={handleChange}
                />
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Board Code</Form.Label>
                {/* use text to preserve leading zeros/alphanumeric codes */}
                <Form.Control
                  type="text"
                  name="courseCode"
                  value={form.courseCode}
                  onChange={handleChange}
                />
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Board Name</Form.Label>
                <Form.Control
                  name="courseName"
                  value={form.courseName}
                  onChange={handleChange}
                />
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Total Fee</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="fee"
                  value={form.fee}
                  onChange={handleChange}
                />
              </Form.Group>
            </div>

            <div className="col-12 mt-3">
              <Button variant="success" className="w-100 w-md-auto" onClick={handleSaveOrUpdate}>
                {form.courseId ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </Form>
      </div>

      <h5 className="mb-3">Boards</h5>
      {loading ? (
        <p>Loading...</p>
      ) : (
        courses.map((course) => (
          <div key={course.programmeId} style={{ margin: "10px" }}>
            <button
              className="w-100 btn btn-dark text-start"
              onClick={() => toggle(course.programmeId)}
            >
              {course.batchName} | {course.programmeCode} - {course.programmeName} | Fee: ₹{course.fee}
              {open[course.programmeId] ? (
                <FaChevronUp className="float-end" />
              ) : (
                <FaChevronDown className="float-end" />
              )}
            </button>
            <Collapse in={open[course.programmeId]}>
              <div className="bg-white border p-3" style={{ transition: "all 0.3s", minHeight: "120px" }}>
                <p><strong>Batch:</strong> {course.batchName}</p>
                <p><strong>Code:</strong> {course.programmeCode}</p>
                <p><strong>Name:</strong> {course.programmeName}</p>
                <p><strong>Fee:</strong> ₹{course.fee}</p>
                <div className="d-flex gap-2">
                  <Button size="sm" variant="info" onClick={() => handleEdit(course)}>
                    <FaEdit /> Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(course.programmeId)}>
                    <FaTrash /> Delete
                  </Button>
                </div>
              </div>
            </Collapse>
          </div>
        ))
      )}
    </div>
  );
};

export default CoursesTab;
