import React, { useEffect, useState, useRef } from "react";
import { Modal } from "react-bootstrap";
import HeaderTop from "../../components/HeaderTop";
import RightSidebar from "../../components/RightSidebar";
import LeftSidebar from "../../components/LeftSidebar";
import Footer from "../../components/Footer";
import { useParams, useLocation, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { Document, Page, pdfjs } from "react-pdf";
import API_BASE_URL from "../../config";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


function InstructorCourseViewPage() {
  const { courseId } = useParams();
  const location = useLocation();

  const courseName = location.state?.paperName || "Unknown courseName";
  const courseCode = location.state?.paperCode || "Unknown courseCode";
  const batchName = location.state?.batchName || "Unknown Batch";
  const courseDisplayName = location.state?.name || "Unknown Name";
  const semester = location.state?.semester || "Unknown Semester";
  const examId = location.state?.examinationID || "Unknown examination ID";

  const [materials, setMaterials] = useState([]);
  const [ebooks, setEBOOKS] = useState([]);
  const [webresources, setwebresources] = useState([]);
  const [faq, setfaq] = useState([]);
  const [misconceptions, setmisconceptions] = useState([]);
  const [practiceassignment, setpracticeassignment] = useState([]);
  const [studyguide, setstudyguide] = useState([]);
  const [videos, setVideos] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [currentVideoProgress, setCurrentVideoProgress] = useState(0);

  const [showFileModal, setShowFileModal] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [fileProgress, setFileProgress] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [visitedPages, setVisitedPages] = useState(new Set());


  const [activeUnit, setActiveUnit] = useState("");
  const [allUnits, setAllUnits] = useState([]);

  const sectionRefs = {
    ebooks: useRef(null),
    videos: useRef(null),
    faq: useRef(null),
    misconceptions: useRef(null),
    practiceassignment: useRef(null),
    studyguide: useRef(null),
    webresources: useRef(null),
  };

  const handleWatchVideo = (url) => {
    const fullUrl = `http://localhost:5129${url}`;
    setVideoUrl(fullUrl);
    setShowVideoModal(true);
    // Load progress from localStorage
    const progress = parseInt(localStorage.getItem(`video-progress-${fullUrl}`)) || 0;
    setCurrentVideoProgress(progress);
  };

  const submitSubjectivePracticeExam = async (examId, studentId, file) => {
    const token = localStorage.getItem("jwt");
    const url = `${API_BASE_URL}/ExamSubmissions/PracticeExamSubjective?ExamId=${examId}&studentId=${studentId}`;
    const headers = {
      "Authorization": `Bearer ${token}`,
    };
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const result = await res.text();

      if (!res.ok) throw new Error(result);

      alert("✅ Subjective practice exam submitted successfully!");
    } catch (err) {
      alert("❌ Failed to submit subjective practice exam.");
    }
  };

  const handleCloseVideo = () => {
    setShowVideoModal(false);
    setVideoUrl("");
    setCurrentVideoProgress(0);
  };

  

  const handleViewFile = (url) => {
  const fullUrl = `http://localhost:5129${url}`;
  setFileUrl(fullUrl);
  setShowFileModal(true);

  // Load progress from localStorage
  const progress = parseInt(localStorage.getItem(`ebook-progress-${fullUrl}`)) || 0;
  setFileProgress(progress);
  };

  const handleCloseFile = () => {
    setShowFileModal(false);
    setFileUrl("");
    setFileProgress(0);
    setPageNumber(1);
    setNumPages(null);
    setVisitedPages(new Set());
  };

  const handlePageChange = (newPage) => {
  setPageNumber(newPage);

  setVisitedPages((prev) => {
    const updated = new Set(prev);
    updated.add(newPage);

    let percent = Math.round((updated.size / numPages) * 100);

    // ✅ If user is on the last page, force 100%
    if (newPage === numPages) {
      percent = 100;
    }

    // Keep max progress (in case of revisits)
    const storedProgress =
      parseInt(localStorage.getItem(`ebook-progress-${fileUrl}`)) || 0;

    const updatedProgress = Math.max(percent, storedProgress);

    setFileProgress(updatedProgress);
    localStorage.setItem(`ebook-progress-${fileUrl}`, updatedProgress);

    return updated;
  });
};

  const [practiceExams, setPracticeExams] = useState([]);

  const [userId, setUserId] = useState(null);
  const [role, setRole] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const extractedUserId = parseInt(decoded?.UserId);
        const extractedRole =
          decoded[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ];

        console.log("🧠 Decoded User ID:", extractedUserId);
        console.log("🧠 Decoded Role:", extractedRole);

        setUserId(extractedUserId);
        setRole(extractedRole);
      } catch (err) {
        console.error("❌ Error decoding JWT:", err);
      }
    }
  }, []);

  useEffect(() => {
    const fetchPracticeExams = async () => {
      if (!activeUnit || !userId) {
        console.warn("⛔ Skipping fetch: activeUnit or userId is missing", {
          activeUnit,
          userId,
        });
        return;
      }

      const unitId = Number(activeUnit.split("-")[1]);
      const examinationId = parseInt(examId);

      const url = `${API_BASE_URL}/InstructorExam/StudentPracticeExams/?userId=${userId}&UnitId=${unitId}&examinationid=${examinationId}`;

      // 📦 Log payload before fetch
      console.log("📤 Fetching Practice Exams With Payload:", {
        userId,
        unitId,
        examinationId,
        fullUrl: url,
      });

      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Check HTTP status
        console.log("📥 Response Status:", res.status);

        const data = await res.json();

        // ✅ Full response logging
        console.log("✅ Practice Exams Fetched:", data);

        if (Array.isArray(data)) {
          setPracticeExams(data);
        } else {
          console.warn("⚠️ API response is not an array:", data);
          setPracticeExams([]);
        }
      } catch (error) {
        console.error("❌ Error fetching practice exams:", error);
        setPracticeExams([]);
      }
    };

    fetchPracticeExams();
  }, [activeUnit, examId, userId]);

  const [adminPracticeTests, setAdminPracticeTests] = useState([]);

  useEffect(() => {
    const fetchAdminPracticeTests = async () => {
      if (!userId || !activeUnit || !examId) {
        console.warn("🚫 Missing userId, activeUnit, or examId", {
          userId,
          activeUnit,
          examId,
        });
        return;
      }

      const unitId = Number(activeUnit.split("-")[1]);
      const examinationId = parseInt(examId);

      const url = `${API_BASE_URL}/AssignmentSubmission/GetPracticeExamsSubmissionsById/?instructorId=${userId}&UnitId=${unitId}&examinationid=${examinationId}`;

      console.log("📤 Fetching Admin Practice Tests", {
        instructorId: userId,
        unitId,
        examinationId,
        url,
      });

      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("📥 Response Status:", res.status);
        const data = await res.json();

        console.log("✅ Admin Practice Tests Fetched:", data);

        if (Array.isArray(data)) {
          setAdminPracticeTests(data);
        } else {
          console.warn("⚠️ Expected an array. Got:", data);
          setAdminPracticeTests([]);
        }
      } catch (error) {
        console.error("❌ Error fetching Admin Practice Tests:", error);
        setAdminPracticeTests([]);
      }
    };

    fetchAdminPracticeTests();
  }, [userId, activeUnit, examId]);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const [contentRes, assignmentRes, liveClassRes] = await Promise.all([
          fetch(`${API_BASE_URL}/Content/Course/${courseId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/Assignment/GetAllAssignments`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/LiveClass/All`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const [content, allAssignments, allLiveClasses] = await Promise.all([
          contentRes.json(),
          assignmentRes.json(),
          liveClassRes.json(),
        ]);

        const cid = parseInt(courseId);

        setMaterials(content.filter((c) => c.contentType === "PDF"));
        setEBOOKS(content.filter((c) => c.contentType === "EBOOK"));
        setVideos(content.filter((c) => c.contentType === "Video"));
        setwebresources(
          content.filter((c) => c.contentType === "WebResources")
        );
        setfaq(content.filter((c) => c.contentType === "FAQ"));
        setmisconceptions(
          content.filter((c) => c.contentType === "Misconceptions")
        );
        setpracticeassignment(
          content.filter((c) => c.contentType === "PracticeAssignment")
        );
        setstudyguide(content.filter((c) => c.contentType === "StudyGuide"));

        setAssignments(allAssignments.filter((a) => a.examinationid === cid));
        setLiveClasses(allLiveClasses.filter((lc) => lc.examinationID === cid));
      } catch (err) {}
    };

    if (courseId) fetchContent();
  }, [courseId]);

  useEffect(() => {
    const scrollTo = location.state?.scrollTo;
    if (scrollTo && sectionRefs[scrollTo]?.current) {
      setTimeout(() => {
        sectionRefs[scrollTo].current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 500);
    }
  }, [
    ebooks,
    videos,
    faq,
    misconceptions,
    practiceassignment,
    studyguide,
    webresources,
  ]);

  useEffect(() => {
    const cleanedUnits = ebooks
      .map((item) => item.unit?.trim())
      .filter(Boolean);

    const uniqueUnits = Array.from(new Set(cleanedUnits)).sort((a, b) => {
      const getUnitNumber = (u) => parseInt(u?.split("-")[1]) || 0;
      return getUnitNumber(a) - getUnitNumber(b);
    });

    setAllUnits(uniqueUnits);
    if (uniqueUnits.length > 0) {
      setActiveUnit(uniqueUnits[0]);
    }
  }, [ebooks]);

  const renderEmptyMessage = (label) => (
    <div className="text-muted text-center py-3">No {label} available.</div>
  );

  const filteredByUnit = (data) =>
    data.filter((item) => item.unit?.trim() === activeUnit);

  const filteredEbooks = filteredByUnit(ebooks);
  const filteredVideos = filteredByUnit(videos);
  const filteredWebResources = filteredByUnit(webresources);
  const filteredFAQ = filteredByUnit(faq);
  const filteredMisconceptions = filteredByUnit(misconceptions);
  const filteredPracticeAssignment = filteredByUnit(practiceassignment);
  const filteredStudyGuide = filteredByUnit(studyguide);

  return (
    <div id="main_content" className="font-muli theme-blush">
      <HeaderTop />
      <RightSidebar />
      <LeftSidebar role="Instructor" />
      <div className="page section-body mt-3 instructor-course-page">
        <div className="container-fluid">
          <div className="jumbotron bg-light p-4 rounded shadow-sm mb-4 welcome-card animate-welcome">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div style={{ width: "150px" }}></div>
              <h2 className="page-title text-primary">View Course Content</h2>
              <a
                href="/my-courseware"
                className="btn btn-outline-primary mt-3 mt-md-0"
              >
                <i className="fa fa-arrow-left mr-1"></i> Back to Courseware
              </a>
            </div>
            <h5 className="course-subtitle text-muted mb-0">
              <strong>{`${batchName} - ${semester} - ${courseCode} - ${courseName} - Exam Id ${examId}`}</strong>
            </h5>
          </div>

          {/* Unit Tabs */}
          <div className="unit-tabs mb-4">
            {allUnits.map((unit) => {
              const titleForUnit =
                ebooks.find((ebook) => ebook.unit?.trim() === unit)?.title ||
                "No title found";

              return (
                <button
                  key={unit}
                  className={`unit-tab ${activeUnit === unit ? "active" : ""}`}
                  onClick={() => setActiveUnit(unit)}
                  title={`${titleForUnit}`}
                >
                  {unit}
                </button>
              );
            })}

            {/* ---- THIS IS THE CHANGE: Pass both examinationId and unitId ---- */}
            <Link
              to="/discussionforum"
              state={{
                examinationId: parseInt(courseId),
                unitId: activeUnit ? Number(activeUnit.split("-")[1]) : null, // <-- just the number, e.g. 1 from "UNIT-1"
              }}
            >
              <button className="unit-tab">Discussion Forum</button>
            </Link>
            {/* ------------ */}

            <Link to="/casestudy">
              <button className="unit-tab">Case Study</button>
            </Link>

            <Link to="/recorded-classes">
              <button className="unit-tab">Recorded classes</button>
            </Link>

          </div>

          {activeUnit && (
            <div className="d-flex justify-content-between align-items-center mb-3 px-1">
              <h5 className="mb-0">
                <i className="fa fa-book text-primary me-2 mr-2"></i> Unit Title:{" "}
                {filteredEbooks[0]?.title || "No title found"}
              </h5>
              {role !== "Student" && (
                <Link
                  to="/add-objective-subjective-assignment"
                  state={{
                    unitId: activeUnit,
                    batchName,
                    semester,
                    courseCode,
                    courseName,
                    examinationID: examId,
                  }}
                >
                  <button className="btn btn-outline-primary">
                    <i className="fa fa-plus me-1"></i> Add Practice Test
                  </button>
                </Link>
              )}
            </div>
          )}

          {/* Section Mapping */}
          {[
            {
              title: "Videos",
              key: "videos",
              data: filteredVideos,
              ref: sectionRefs.videos,
              color: "info",
              icon: "fas fa-video",
            },
            {
              title: "EBOOK Materials",
              key: "ebooks",
              data: filteredEbooks,
              ref: sectionRefs.ebooks,
              color: "primary",
              icon: "fas fa-file-pdf",
            },
            {
              title: "Web Resources Materials",
              key: "webresources",
              data: filteredWebResources,
              ref: sectionRefs.webresources,
              color: "primary",
              icon: "fas fa-file-pdf",
            },
            {
              title: "Pre-Learning : FAQ",
              key: "faq",
              data: filteredFAQ,
              ref: sectionRefs.faq,
              color: "primary",
              icon: "fas fa-file-pdf",
            },
            {
              title: "Pre-Learning : Misconceptions",
              key: "misconceptions",
              data: filteredMisconceptions,
              ref: sectionRefs.misconceptions,
              color: "primary",
              icon: "fas fa-file-pdf",
            },
            {
              title: "Practice Assignment",
              key: "practiceassignment",
              data: filteredPracticeAssignment,
              ref: sectionRefs.practiceassignment,
              color: "primary",
              icon: "fas fa-file-pdf",
            },
            {
              title: "Study Guide",
              key: "studyguide",
              data: filteredStudyGuide,
              ref: sectionRefs.studyguide,
              color: "primary",
              icon: "fas fa-file-pdf",
            },
          ].map((section, idx) => (
            <div
              key={idx}
              ref={section.ref}
              className={`card shadow-sm mb-4 section-card animate-section border-${section.color}`}
            >
              <div className={`card-header bg-${section.color} text-white`}>
                <h6 className="mb-0">
                  <i className={`${section.icon} me-2 mr-2`}></i>
                  {section.title}
                </h6>
              </div>
              <div className="card-body">
                {section.data.length === 0 ? (
                  renderEmptyMessage(section.title)
                ) : (
                  <div className="row">
                    {section.data.map((item, idx2) => {
                      // Progress key per section
                      let progressKey = '';
                      if (section.key === "videos") {
                        progressKey = `video-progress-http://localhost:5129${item.fileUrl}`;
                      } else if (section.key === "ebooks") {
                        progressKey = `ebook-progress-http://localhost:5129${item.fileUrl}`;
                      } else if (section.key === "webresources") {
                        progressKey = `webresource-progress-http://localhost:5129${item.fileUrl}`;
                      } else if (section.key === "faq") {
                        progressKey = `faq-progress-http://localhost:5129${item.fileUrl}`;
                      } else if (section.key === "misconceptions") {
                        progressKey = `misconception-progress-http://localhost:5129${item.fileUrl}`;
                      } else if (section.key === "practiceassignment") {
                        progressKey = `practiceassignment-progress-http://localhost:5129${item.fileUrl}`;
                      } else if (section.key === "studyguide") {
                        progressKey = `studyguide-progress-http://localhost:5129${item.fileUrl}`;
                      } else if (section.key === "liveclass") {
                        progressKey = `liveclass-progress-http://localhost:5129${item.fileUrl}`;
                      } else if (section.key === "assignments") {
                        progressKey = `assignment-progress-http://localhost:5129${item.fileUrl}`;
                      } else if (section.key === "exams") {
                        progressKey = `exam-progress-http://localhost:5129${item.fileUrl}`;
                      } else if (section.key === "discussionforum") {
                        progressKey = `discussion-progress-http://localhost:5129${item.fileUrl}`;
                      }
                      let progress = parseInt(localStorage.getItem(progressKey)) || 0;
                      let progressColor = progress < 30 ? "#e74c3c" : progress < 70 ? "#f39c12" : "#27ae60";
                      return (
                        <div className="col-md-6 col-lg-4 mb-3" key={idx2}>
                          <div className="resource-card welcome-card animate-welcome h-100">
                            <div className="card-body d-flex flex-column">
                              <h6 className="fw-bold">{item.title}</h6>
                              <p className="text-muted flex-grow-1">
                                {item.description}
                              </p>
                              {/* Progress bar for all resource types */}
                              {section.key === "videos" ? (
                                <>
                                  <button
                                    className="btn btn-sm btn-outline-info mt-auto"
                                    onClick={() => handleWatchVideo(item.fileUrl)}
                                  >
                                    Watch Video
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="btn btn-sm btn-outline-primary mt-auto"
                                  onClick={() => handleViewFile(item.fileUrl)}
                                >
                                  View File
                                </button>
                              )}
                              <div style={{ marginTop: "12px" }}>
                                <div style={{ fontSize: "0.95rem", marginBottom: "2px" }}>
                                  <span>{section.title} Progress: </span>
                                  <span style={{ color: progressColor, fontWeight: 600 }}>{progress}%</span>
                                </div>
                                <div style={{
                                  width: "100%",
                                  height: "8px",
                                  background: "#eee",
                                  borderRadius: "6px",
                                  overflow: "hidden"
                                }}>
                                  <div style={{
                                    width: `${progress}%`,
                                    height: "100%",
                                    background: progressColor,
                                    transition: "width 0.5s"
                                  }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {role === "Student" ? (
         <div className="container-fluid">
  <div className="card shadow-sm mb-5 section-card animate-section border-info">
    <div className="card-header bg-info text-white">
      <h6 className="mb-0">
        <i className="fa fa-tools me-2 mr-2"></i> Student Practice Exams
      </h6>
    </div>

    <div className="card-body">
      {practiceExams.length === 0 ? (
        <div className="text-muted text-center py-3">
          No practice exams available.
        </div>
      ) : (
        <div className="row">
          {practiceExams.map((exam, idx) => {
            const isSubjective = exam.examType?.toUpperCase() === "DP";
            const isAttendStatus =
              exam.examStatus?.toLowerCase() === "attendexam";
            const isMCQ = exam.examType === "MP";

            return (
              <div className="col-md-6 col-lg-4 mb-3" key={exam.examid}>
                <div className="resource-card welcome-card animate-welcome h-100">
                  <div
                    className="card-body d-flex flex-column"
                    style={{ textAlign: "left", gap: "6px" }}
                  >
                    <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                      <i className="fa fa-book text-primary mr-2"></i>
                      {exam.title}
                    </h6>

                    <p className="mb-2">
                      <i className="fa fa-calendar-plus me-2 mr-2 text-success"></i>
                      <strong>Created At:</strong>{" "}
                      {new Date(exam.createdAt).toLocaleString()}
                    </p>

                    <p className="mb-2">
                      <i className="fa fa-clock me-2 mr-2 text-primary"></i>
                      <strong>Duration:</strong> {exam.durationMinutes} min
                    </p>

                    <p className="mb-2">
                      <i className="fa fa-star me-2 mr-2 text-warning"></i>
                      <strong>Marks:</strong> {exam.totmrk} |{" "}
                      <strong>Pass:</strong> {exam.passmrk}
                    </p>

                    <p className="mb-2">
                      <i className="fa fa-layer-group me-2 mr-2 text-secondary"></i>
                      <strong>Unit:</strong> {exam.unitId}
                    </p>

                    {exam.fileurl ? (
                      <a
                        href={`http://localhost:5129${exam.fileurl}`}
                        className="btn btn-sm btn-outline-primary"
                        target="_blank"
                        rel="noreferrer"
                      >
                        📄 View Attachment
                      </a>
                    ) : !isMCQ ? (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        disabled
                      >
                        🚫 No Attachment
                      </button>
                    ) : null}

                    {isMCQ && isAttendStatus && (
                      <Link
                        to={`/practice-exam/${exam.examid}`}
                        state={{ exam }}
                        className="mt-2"
                      >
                        <button className="btn btn-sm btn-success w-100">
                          📝 Attend Practice Exam
                        </button>
                      </Link>
                    )}

                    {isSubjective && isAttendStatus && userId && (
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) =>
                          submitSubjectivePracticeExam(
                            exam.examid,
                            userId,
                            e.target.files[0]
                          )
                        }
                        className="form-control mt-2"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
</div>

        ) : (
          <div className="container-fluid">
            <div className="card shadow-sm mb-5 section-card animate-section border-info">
              <div className="card-header bg-info text-white">
                <h6 className="mb-0">
                  <i className="fa fa-tools me-2 mr-2"></i> View Practice Tests
                </h6>
              </div>

              <div className="card-body">
                {adminPracticeTests.length === 0 ? (
                  <div className="text-muted text-center py-3">
                    No practice test records found.
                  </div>
                ) : (
                  <div className="row">
                    {adminPracticeTests.map((test, idx) => {
                      const isObjective =
                        (test.PracticeExamType || "").toLowerCase() ===
                        "objective";
                      const isSubjective =
                        (test.PracticeExamType || "").toLowerCase() ===
                        "subjective";

                      const typeBadge = isObjective ? (
                        <span className="badge bg-primary text-white px-2 py-1 rounded-pill">
                          <i className="fa fa-list me-1"></i> Objective
                        </span>
                      ) : isSubjective ? (
                        <span className="badge bg-warning text-dark px-2 py-1 rounded-pill">
                          <i className="fa fa-file-alt me-1"></i> Subjective
                        </span>
                      ) : (
                        <span className="badge bg-secondary text-white px-2 py-1 rounded-pill">
                          {test.PracticeExamType}
                        </span>
                      );

                      return (
                        <div
                          className="col-md-6 col-lg-4 mb-3"
                          key={test.examid}
                        >
                          <div className="resource-card welcome-card animate-welcome h-100">
                            <div
                              className="card-body d-flex flex-column"
                              style={{ textAlign: "left", gap: "6px" }}
                            >
                              <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                                <i className="fa fa-book text-primary"></i>
                                {test.AssignmentTitle}
                              </h6>

                              <p className="mb-2">
                                <i className="fa fa-user me-2 mr-2 text-dark"></i>
                                {test.pname}
                              </p>

                              <p className="mb-2">
                                <i className="fa fa-layer-group me-2 mr-2 text-secondary"></i>
                                <strong>Unit:</strong> {activeUnit}
                              </p>

                              <p className="mb-2">
                                <i className="fa fa-clock me-2 mr-2 text-primary"></i>
                                <strong>Duration:</strong> {test.Duration} min
                              </p>

                              <p className="mb-2">
                                <i className="fa fa-star me-2 mr-2 text-warning"></i>
                                <strong>Marks:</strong> {test.totmrk} |{" "}
                                <strong>Pass:</strong> {test.passmrk}
                              </p>

                              <p className="mb-2">
                                <i className="fa fa-check-circle me-2 mr-2 text-success"></i>
                                <strong>Attempted:</strong>{" "}
                                {test.attempted ? "Yes" : "No"}
                              </p>

                              <p className="mb-2">
                                <i className="fa fa-calendar-alt me-2 mr-2 text-danger"></i>
                                <strong>From:</strong>{" "}
                                {new Date(test.StartDate).toLocaleDateString()}{" "}
                                - {new Date(test.EndDate).toLocaleDateString()}
                              </p>

                              <div className="mt-auto text-end">
                                {typeBadge}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />

      <Modal show={showVideoModal} onHide={handleCloseVideo} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Video Playback</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <video
            controls
            controlsList="nodownload"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            width="100%"
              onTimeUpdate={e => {
                const video = e.target;
                if (video.duration > 0) {
                  const percent = Math.round((video.currentTime / video.duration) * 100);

                // Get stored progress
                const storedProgress = parseInt(localStorage.getItem(`video-progress-${videoUrl}`)) || 0;

                // keep the max value
                const updatedProgress = Math.max(percent, storedProgress);

                setCurrentVideoProgress(updatedProgress);
                localStorage.setItem(`video-progress-${videoUrl}`, updatedProgress);
                }
              }}
              onLoadedMetadata={e => {
                // Seek to last watched position
                const video = e.target;
                const percent = parseInt(localStorage.getItem(`video-progress-${videoUrl}`)) || 0;
                if (video.duration > 0 && percent > 0) {
                  video.currentTime = (percent / 100) * video.duration;
                }
              }}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support HTML5 video.
          </video>
            {/* Video progress bar below video */}
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "0.95rem", marginBottom: "2px" }}>
                <span>Video Progress: </span>
                <span style={{ color: currentVideoProgress < 30 ? "#e74c3c" : currentVideoProgress < 70 ? "#f39c12" : "#27ae60", fontWeight: 600 }}>{currentVideoProgress}%</span>
              </div>
              <div style={{
                width: "100%",
                height: "8px",
                background: "#eee",
                borderRadius: "6px",
                overflow: "hidden"
              }}>
                <div style={{
                  width: `${currentVideoProgress}%`,
                  height: "100%",
                  background: currentVideoProgress < 30 ? "#e74c3c" : currentVideoProgress < 70 ? "#f39c12" : "#27ae60",
                  transition: "width 0.5s"
                }}></div>
              </div>
            </div>
        </Modal.Body>
      </Modal>

      <Modal show={showFileModal} onHide={handleCloseFile} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>View PDF</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          >
            <Page pageNumber={pageNumber} width={600} />
          </Document>

          {numPages && (
            <div className="d-flex justify-content-between mt-3">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={pageNumber <= 1}
                onClick={() => handlePageChange(pageNumber - 1)}
              >
                Prev
              </button>
              <span>
                Page {pageNumber} of {numPages}
              </span>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={pageNumber >= numPages}
                onClick={() => handlePageChange(pageNumber + 1)}
              >
                Next
              </button>
            </div>
          )}

          {/* File progress */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "0.95rem", marginBottom: "2px" }}>
              <span>File Progress: </span>
              <span style={{ color: fileProgress < 30 ? "#e74c3c" : fileProgress < 70 ? "#f39c12" : "#27ae60", fontWeight: 600 }}>
                {fileProgress}%
              </span>
            </div>
            <div style={{
              width: "100%",
              height: "8px",
              background: "#eee",
              borderRadius: "6px",
              overflow: "hidden"
            }}>
              <div style={{
                width: `${fileProgress}%`,
                height: "100%",
                background: fileProgress < 30 ? "#e74c3c" : fileProgress < 70 ? "#f39c12" : "#27ae60",
                transition: "width 0.5s"
              }}></div>
            </div>
          </div>
        </Modal.Body>
      </Modal>

    </div>
  );
}

export default InstructorCourseViewPage;
