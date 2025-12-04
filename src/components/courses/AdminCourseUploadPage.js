import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Modal } from "react-bootstrap";
import HeaderTop from "../../components/HeaderTop";
import RightSidebar from "../../components/RightSidebar";
import LeftSidebar from "../../components/LeftSidebar";
import Footer from "../../components/Footer";
import API_BASE_URL from "../../config";

function AdminCourseUploadPage() {
  const { courseId } = useParams();
  const examinationId = courseId;
  const navigate = useNavigate();
  const location = useLocation();

  const courseName = location.state?.paperName || "Unknown Course";
  const courseCode = location.state?.paperCode || "Unknown Code";
  const batchName = location.state?.batchName || "Unknown Batch";
  const semester = location.state?.semester || "Unknown Semester";

  const [showUploadModal, setShowUploadModal] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    contentType: "EBOOK", // default
    vurl: "",
  });

  const [file, setFile] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");

  // 'S' = Student, 'O' = Others
  const [userType, setUserType] = useState("");

  // Fetch units
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(
          `${API_BASE_URL}/Examination/GetUnitsById/${examinationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        console.log("📦 Units fetched:", data);
        setUnits(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Failed to fetch units:", err);
      }
    })();
  }, [examinationId]);

  // Auto-fill title from unit
  useEffect(() => {
    const selected = units.find((u) => u.unitId === Number(selectedUnitId));
    if (selected?.title) {
      setForm((prev) => ({ ...prev, title: selected.title }));
    }
  }, [selectedUnitId, units]);

  // Checkbox handler for Student / Others (mutually exclusive)
  const handleUserTypeChange = (type) => {
    setUserType((prev) => (prev === type ? "" : type));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation: must have a unit
    if (!selectedUnitId) {
      alert("Please select a unit");
      return;
    }

    // Validation: must choose Student or Others
    if (!userType) {
      alert("Please select Student or Others");
      return;
    }

    // Validation: must provide at least one of file or vurl
    if (!file && !form.vurl?.trim()) {
      alert("Please select a file OR enter a URL");
      return;
    }

    const fd = new FormData();
    if (file) fd.append("file", file);
    fd.append("courseId", courseId);
    fd.append("title", form.title || "");
    fd.append("description", form.description || "");
    fd.append("contentType", form.contentType || "");
    fd.append("unitId", Number(selectedUnitId));
    fd.append("vurl", form.vurl || "");
    fd.append("userType", userType); // 'S' or 'O'

    const debugPayload = {
      courseId,
      unitId: Number(selectedUnitId),
      title: form.title,
      description: form.description,
      contentType: form.contentType,
      hasFile: !!file,
      fileName: file?.name || null,
      vurl: form.vurl || "",
      userType,
    };
    console.log("📤 Uploading payload (debug):", debugPayload);

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Content/UploadFile`, {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });

      const responseText = await res.text();
      console.log("📥 Raw response:", res.status, responseText);

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

      let json = null;
      try {
        json = JSON.parse(responseText);
      } catch {}
      console.log("✅ Parsed response JSON:", json);

      alert("✅ Content uploaded successfully");

      setForm({ title: "", description: "", contentType: "EBOOK", vurl: "" });
      setFile(null);
      setSelectedUnitId("");
      setUserType("");
      setShowUploadModal(false);
      navigate("/my-courseware");
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("❌ Upload failed");
    }
  };

  return (
    <div id="main_content" className="font-muli theme-blush">
      <HeaderTop />
      <RightSidebar />
      <LeftSidebar role="Admin" />

      <div className="page section-body mt-3">
        <div className="container-fluid">
          <div className="p-4 rounded mb-4 welcome-card animate-welcome d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <h2 className="text-primary mb-2">⬆ Upload Course Content</h2>
              <p className="text-muted mb-0">
                Examination ID: <strong>{examinationId}</strong>
              </p>
            </div>
            <button
              className="btn btn-outline-primary mt-3 mt-md-0"
              onClick={() => navigate("/my-courseware")}
            >
              <i className="fa fa-arrow-left me-1"></i> Back to Courses
            </button>
          </div>

          <div className="course-card welcome-card animate-welcome">
            <div className="course-header d-flex justify-content-between align-items-center mb-2">
              <h5 className="course-title text-dark">Upload New Course Material</h5>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setShowUploadModal(true)}
              >
                <i className="fas fa-upload me-1"></i> Upload
              </button>
            </div>
            <p className="text-muted mb-0">Click the button to add files or link.</p>
          </div>

          <Modal
            show={showUploadModal}
            onHide={() => {
              setShowUploadModal(false);
              navigate("/my-courseware");
            }}
            size="lg"
            centered
          >
            <Modal.Header>
              <Modal.Title>
                ⬆ Upload Course Content — {courseCode} - {courseName}
              </Modal.Title>
              <button
                type="button"
                className="close"
                onClick={() => {
                  setShowUploadModal(false);
                  navigate("/my-courseware");
                }}
              >
                <span>&times;</span>
              </button>
            </Modal.Header>
            <Modal.Body>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Select Unit</label>
                  <select
                    className="form-control"
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Unit --</option>
                    {units.map((unit) => (
                      <option key={unit.unitId} value={unit.unitId}>
                        Unit {unit.unitNumber} - {unit.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional: title auto-filled from unit */}
                {/* <div className="form-group">
                  <label>Title</label>
                  <div className="form-control bg-light" style={{ minHeight: "38px" }}>
                    {form.title}
                  </div>
                </div> */}

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-control"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Content Type</label>
                  <select
                    className="form-control"
                    value={form.contentType}
                    onChange={(e) =>
                      setForm({ ...form, contentType: e.target.value })
                    }
                  >
                    <option value="EBOOK">EBOOK</option>
                    <option value="WebResources">Web Resources</option>
                    <option value="Video">Video</option>
                  </select>
                </div>

                {/* Student / Others checkboxes */}
                <div className="form-group">
                  <label>
                    Visible To <span className="text-danger">*</span>
                  </label>
                  <div className="d-flex align-items-center">
                    <div className="form-check mr-4">
                      <input
                        type="checkbox"
                        id="chkStudent"
                        className="form-check-input"
                        checked={userType === "S"}
                        disabled={userType === "O"}
                        onChange={() => handleUserTypeChange("S")}
                      />
                      <label
                        htmlFor="chkStudent"
                        className="form-check-label"
                      >
                        Students
                      </label>
                    </div>

                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="chkOthers"
                        className="form-check-input"
                        checked={userType === "O"}
                        disabled={userType === "S"}
                        onChange={() => handleUserTypeChange("O")}
                      />
                      <label
                        htmlFor="chkOthers"
                        className="form-check-label"
                      >
                        Others
                      </label>
                    </div>
                  </div>
                  <small className="text-muted d-block mt-1">
                    Choose exactly one: Students (S) or Others (O).
                  </small>
                </div>

                <div className="form-group">
                  <label>Select File (optional if URL is given)</label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                <div className="form-group">
                  <label>Upload URL (optional if File is chosen)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://… (YouTube/Vimeo/Drive/Any link)"
                    value={form.vurl}
                    onChange={(e) =>
                      setForm({ ...form, vurl: e.target.value })
                    }
                  />
                  <small className="text-muted">
                    Provide at least a File or a URL.
                  </small>
                </div>

                <button type="submit" className="btn btn-primary mt-3">
                  Upload
                </button>
              </form>
            </Modal.Body>
          </Modal>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default AdminCourseUploadPage;
