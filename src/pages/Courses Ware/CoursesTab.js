import React, { useEffect, useState } from "react";
import { Form, Button, Collapse } from "react-bootstrap";
import { toast } from "react-toastify";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import API_BASE_URL from "../../config";

const DEBUG = true;
const CoursesTab = ({ isActive }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({});

  const [form, setForm] = useState({
    courseCode: "",
    courseName: "",
    fee: "",
    courseId: null,
  });

  // fetch courses when tab becomes active
  useEffect(() => {
    if (isActive) {
      fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (DEBUG) console.log("Loaded Programmes:", normalized);
    } catch (e) {
      toast.error("❌ Failed to fetch courses", { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };



  // ====== FIX 1: derive courseName from the selected courseCode (AP-Andhra Pradesh) ======
  const handleChange = (e) => {
    const { name, value } = e.target;

    console.log(`🔄 handleChange: ${name} = ${value}`);

    if (name === "courseCode") {
      let next = { ...form, courseCode: value };
      if (value && value.includes("-")) {
        const [, right] = value.split("-", 2);
        next.courseName = (right || "").trim();
        console.log(`📝 Derived courseName: ${next.courseName}`);
      } else if (!form.courseName) {
        next.courseName = "";
      }
      setForm(next);
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (course) => {
    // Check if programmeCode already contains hyphen (combined format)
    let courseCodeForForm;
    if (course.programmeCode.includes('-')) {
      // Already in combined format, use as is
      courseCodeForForm = course.programmeCode;
    } else {
      // Create combined format
      courseCodeForForm = `${course.programmeCode}-${course.programmeName}`;
    }
    
    console.log("🔄 Editing course:", {
      original: course,
      courseCodeForForm,
      programmeCode: course.programmeCode,
      programmeName: course.programmeName
    });
    
    setForm({
      courseCode: courseCodeForForm,
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

    const { courseCode, courseName, fee, courseId } = form;

    // ====== FIX 2: only require Board + Fee; name is derived or split on backend ======
    if (!courseCode || !fee) {
      toast.error("❌ Please select a Board and enter Total Fee", {
        autoClose: 3000,
      });
      return;
    }

    // Split courseCode to get proper programmeCode and programmeName
    let finalProgrammeCode, finalProgrammeName;
    
    if (courseCode.includes("-")) {
      const [code, name] = courseCode.split("-", 2);
      finalProgrammeCode = code?.trim() || "";
      finalProgrammeName = name?.trim() || "";
    } else {
      finalProgrammeCode = courseCode;
      finalProgrammeName = courseName?.trim() || "";
    }

    if (!finalProgrammeCode || !finalProgrammeName) {
      toast.error("❌ Please provide valid Board information", {
        autoClose: 3000,
      });
      return;
    }

    const payload = {
      programmeName: finalProgrammeName,
      programmeCode: finalProgrammeCode, // send just the code part (AP, TG, etc.)
      numberOfSemesters: 1,
      fee: parseFloat(fee),
      installments: 1,
      isCertCourse: false,
      isNoGrp: false,
    };

    console.log("💾 Payload being sent:", payload);

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

      toast.success(
        `✅ Board ${courseId ? "updated" : "created"} successfully`,
        {
          autoClose: 3000,
        }
      );

      // Reset form
      setForm({
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
    <div className="container py-0 pt-0 welcome-card animate-welcome">
      <div className="mb-0 bg-glass p-0">
        <h5 className="mb-0 mt-0 text-primary">Add / Edit Boards</h5>
        <Form>
          <div className="row gy-3">
            {/* Board dropdown (combined value like AP-Andhra Pradesh) */}
            <div className="col-md-4">
              <Form.Group>
                <Form.Label>Board</Form.Label>
                <Form.Control
                  as="select"
                  name="courseCode"
                  value={form.courseCode || ""}
                  onChange={handleChange}
                  required
                  disabled={form.courseId !== null} // Disable when editing
                >
                  <option value="">Select Board</option>
                  {[
                    "AP-Andhra Pradesh",
                    "TG-Telangana", 
                    "CB-Central Board",
                    "IC-International",
                  ].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  {/* If form has a courseCode that doesn't match predefined options, add it */}
                  {form.courseCode && 
                   !["AP-Andhra Pradesh", "TG-Telangana", "CB-Central Board", "IC-International"].includes(form.courseCode) && (
                    <option key={form.courseCode} value={form.courseCode}>
                      {form.courseCode}
                    </option>
                  )}
                </Form.Control>
              </Form.Group>
            </div>

            {/* Board Name field intentionally removed/commented; name is auto-derived */}
            {/*
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
            */}

            <div className="col-md-4">
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

            <div className="col-12 col-md-4 d-flex align-items-center mt-4 gap-2">
              <Button
                variant="success"
                className="w-75 w-md-auto"
                onClick={handleSaveOrUpdate}
              >
                {form.courseId ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </Form>
      </div>

      <h5 className="mb-3">Boards</h5>

      <div className="semester-panel-body">
        {loading ? (
          <p>Loading...</p>
        ) : (
          courses.map((course) => (
            <div key={course.programmeId} style={{ margin: "10px" }}>
              <button
                className="w-100 btn btn-dark text-start"
                onClick={() => toggle(course.programmeId)}
              >
                {course.programmeCode} - {course.programmeName} | Fee: ₹{course.fee}
                {open[course.programmeId] ? (
                  <FaChevronUp className="float-end" />
                ) : (
                  <FaChevronDown className="float-end" />
                )}
              </button>
              <Collapse in={open[course.programmeId]}>
                <div
                  className="bg-white border p-3"
                  style={{ transition: "all 0.3s", minHeight: "120px" }}
                >
                  <p>
                    <strong>Code:</strong> {course.programmeCode}
                  </p>
                  <p>
                    <strong>Name:</strong> {course.programmeName}
                  </p>
                  <p>
                    <strong>Fee:</strong> ₹{course.fee}
                  </p>
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="info"
                      onClick={() => handleEdit(course)}
                    >
                      <i className="fa-solid fa-pen-to-square" ></i>
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(course.programmeId)}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </Button>
                  </div>
                </div>
              </Collapse>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CoursesTab;
