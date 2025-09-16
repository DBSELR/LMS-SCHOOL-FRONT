import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import HeaderTop from "../../components/HeaderTop";
import RightSidebar from "../../components/RightSidebar";
import LeftSidebar from "../../components/LeftSidebar";
import Footer from "../../components/Footer";
import { useLocation } from "react-router-dom";
import API_BASE_URL from "../../config";

function AdminCourseUploadPage() {
  const { courseId } = useParams(); // This holds examinationId as per your routing
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
    contentType: "EBOOK",
  });
  const [file, setFile] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");

  // Fetch units on load using examinationId
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(
          `${API_BASE_URL}/Examination/GetUnitsById/${examinationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        console.log("📦 Units fetched:", data);
        setUnits(data || []);
      } catch (err) {
        console.error("❌ Failed to fetch units:", err);
      }
    };

    fetchUnits();
  }, [examinationId]);

  // Auto-fill title when unit is selected
  useEffect(() => {
    const selected = units.find((u) => u.unitId === parseInt(selectedUnitId));
    if (selected && selected.title) {
      setForm((prev) => ({ ...prev, title: selected.title }));
    }
  }, [selectedUnitId, units]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file");
    if (!selectedUnitId) return alert("Please select a unit");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("courseId", courseId); // still sending this key for compatibility
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("contentType", form.contentType);
    formData.append("unitId", selectedUnitId);

    console.log("📤 Uploading payload:", {
      courseId,
      unitId: selectedUnitId,
      title: form.title,
      description: form.description,
      contentType: form.contentType,
      file: file?.name,
    });

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Content/UploadFile`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resultText = await res.text();
      console.log("📥 Response:", res.status, resultText);

      if (!res.ok) throw new Error("Upload failed");
      alert("✅ Content uploaded successfully");

      setForm({ title: "", description: "", contentType: "EBOOK" });
      setFile(null);
      setSelectedUnitId("");
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
              <h5 className="course-title text-dark">
                Upload New Course Material
              </h5>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setShowUploadModal(true)}
              >
                <i className="fas fa-upload me-1"></i> Upload
              </button>
            </div>
            <p className="text-muted mb-0">Click the button to add files.</p>
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
                    <option value="FAQ">Pre-Learning : FAQ</option>
                    <option value="Misconceptions">
                      Pre-Learning : Misconceptions
                    </option>
                    <option value="PracticeAssignment">
                      Practice Assignment
                    </option>
                    <option value="StudyGuide">Study Guide</option>
                    <option value="Video">Video</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Select File</label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={(e) => setFile(e.target.files[0])}
                    required
                  />
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
