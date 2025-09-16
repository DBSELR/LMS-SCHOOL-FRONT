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
    numberOfSemesters: 1,
    fee: "",
    isCertCourse: false,
    isNoGrp: false,
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      const normalized = data.map((course) => ({
        ...course,
        isCertCourse: course.isCertCourse ?? course.IsCertCourse ?? false,
        isNoGrp: course.isNoGrp ?? course.IsNoGrp ?? false,
      }));
      setCourses(normalized);
      console.log("Loaded Programmes :",courses);
    } catch {
      toast.error("❌ Failed to fetch courses", { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      // 🔒 Enforce rule: If cert course is checked, isNoGrp must also be checked
      if (name === "isCertCourse") {
        if (checked) {
          updated.isNoGrp = true;
        }
      }

      return updated;
    });
  };


  const handleEdit = (course) => {
    setForm({
      batchName: course.batchName,
      courseCode: course.programmeCode,
      courseName: course.programmeName,
      numberOfSemesters: course.numberOfSemesters,
      fee: course.fee,
      isCertCourse: !!course.isCertCourse,
      isNoGrp: !!course.isNoGrp,
      courseId: course.programmeId,
      installments : course.installments,
    });
  };

  const handleDelete = async (courseId) => {
    toast.dismiss();
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Programme/${courseId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const errorText = await res.text();
      if (!res.ok) throw new Error(errorText || "Delete failed");

      toast.success("🗑️ Programme Deleted successfully", { autoClose: 3000 });
      fetchCourses();
    } catch (err) {
      toast.error(`❌ Deletion failed: ${err.message}`, { autoClose: 3000 });
    }
  };

  const handleSaveOrUpdate = async () => {
    toast.dismiss();

    const {
      batchName,
      courseCode,
      courseName,
      numberOfSemesters,
      fee,
      installments,
      isCertCourse,
      isNoGrp,
      courseId,
    } = form;

    if (!batchName || !courseCode || !courseName || !fee || !installments) {
      toast.error("❌ Please fill all fields", { autoClose: 3000 });
      return;
    }

    const payload = {
      programmeName: courseName,
      programmeCode: courseCode,
      numberOfSemesters: parseInt(numberOfSemesters),
      fee: parseFloat(fee),
      installments:parseInt(installments),
      batchName,
      isCertCourse,
      isNoGrp,
    };

    try {
      const token = localStorage.getItem("jwt");
      const url = courseId
        ? `${API_BASE_URL}/Programme/Update/${courseId}`
        : `${API_BASE_URL}/Programme`;
      const method = courseId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const errorText = await res.text();
      if (!res.ok) throw new Error(errorText || "Save failed");

      toast.success(`✅ Programme ${courseId ? "updated" : "created"} successfully`, {
        autoClose: 3000,
      });

      setForm({
        batchName: "",
        courseCode: "",
        courseName: "",
        numberOfSemesters: 1,
        fee: "",
        installments:"",
        isCertCourse: false,
        isNoGrp: false,
        courseId: null,
      });

      fetchCourses();
    } catch (err) {
      toast.error(`❌ Save failed: ${err.message}`, { autoClose: 3000 });
    }
  };

  const toggle = (id) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="container py-4 welcome-card animate-welcome">
      <div className="mb-4 bg-glass p-4">
        <h5 className="mb-4 text-primary">Add / Edit Programmes</h5>
        <Form>
          <div className="row gy-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Batch</Form.Label>
                <Form.Control name="batchName" value={form.batchName} onChange={handleChange} />
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Programme Code</Form.Label>
                <Form.Control type="number" name="courseCode" value={form.courseCode} onChange={handleChange} />
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Programme Name</Form.Label>
                <Form.Control name="courseName" value={form.courseName} onChange={handleChange} />
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Semesters</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  name="numberOfSemesters"
                  value={form.numberOfSemesters}
                  onChange={handleChange}
                />
              </Form.Group>
            </div>

            <div className="col-md-12 d-flex gap-4 mt-2 flex-wrap">
              <Form.Check
                label="Is Certificate Course"
                name="isCertCourse"
                type="checkbox"
                checked={form.isCertCourse}
                onChange={handleChange}
              />
              <Form.Check
                label="Is No Grp"
                name="isNoGrp"
                type="checkbox"
                checked={form.isNoGrp}
                onChange={handleChange}
                disabled={form.isCertCourse} // 🔒 disable when cert course is selected
              />
            </div>


            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Total Fee</Form.Label>
                <Form.Control name="fee" value={form.fee} onChange={handleChange} />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Installments</Form.Label>
                <Form.Control name="installments" value={form.installments} onChange={handleChange} />
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

      <h5 className="mb-3">Programmes</h5>
      {loading ? (
        <p>Loading...</p>
      ) : (
        courses.map((course) => (
          <div key={course.programmeId} style={{ margin: "10px" }}>
            <button className="w-100 btn btn-dark text-start" onClick={() => toggle(course.programmeId)}>
              {course.batchName} | {course.programmeCode} - {course.programmeName} | Sem: {course.numberOfSemesters} | Fee: ₹{course.fee}
              {open[course.programmeId] ? (
                <FaChevronUp className="float-end" />
              ) : (
                <FaChevronDown className="float-end" />
              )}
            </button>
            <Collapse in={open[course.programmeId]}>
             <div
    className="bg-white border p-3"
    style={{ transition: "all 0.3s", minHeight: "120px" }} // adjust minHeight as needed
  >
                <p>
                  <strong>Code:</strong> {course.programmeCode}
                </p>
                <p>
                  <strong>Name:</strong> {course.programmeName}
                </p>
                <p>
                  <strong>Semesters:</strong> {course.numberOfSemesters}
                </p>
                <p>
                  <strong>Fee:</strong> ₹{course.fee}
                </p>
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
