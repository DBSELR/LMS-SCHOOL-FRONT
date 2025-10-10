// File: src/pages/InstructorDashboard.jsx
import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import HeaderTop from "../components/HeaderTop";
import RightSidebar from "../components/RightSidebar";
import LeftSidebar from "../components/LeftSidebar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";

function InstructorDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    courses: 0,
    students: 0,
    submissions: 0,
    exams: 0,
    assignments: 0,
    books: 0,
    liveClasses: 0,
    attendanceRecords: 0,
    meetings: 0,
    leaves: 0,
    notifications: 0
  });
  const [gradingStats, setGradingStats] = useState({
    total: 0, graded: 0, pending: 0, averageScore: 0
  });
  const [instructorName, setInstructorName] = useState("Instructor");

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) return;

    const decoded = jwtDecode(token);
    const role = decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    const name = decoded["Username"] || decoded.name || "Instructor";
    const instructorId = decoded?.UserId || decoded?.id || 0;
    setInstructorName(name);

    if (role !== "Instructor") return;

    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(`${API_BASE_URL}/InstructorSummary/dashboard/${instructorId}`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json();
        setSummary({
          subjects: data.subjects || 0,
          students: data.students || 0,
          submissions: data.assignments || 0,
          exams: data.exams || 0,
          books: data.books || 0,
          assignments: data.assignments || 0,
          liveClasses: data.liveClasses || 0,
          attendanceRecords: 0,
          meetings: data.tasks || 0,
          leaves: data.leaves || 0,
          notifications: data.notifications || 0
        });
      } catch (err) {
        console.error("Failed to fetch instructor summary", err);
      }
    };

    const fetchGradingStats = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(`${API_BASE_URL}/InstructorExam/GradingSummary`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json();
        setGradingStats(data);
      } catch (err) {
        console.error("Grading stats fetch failed", err);
      }
    };

    const loadData = async () => {
      await Promise.all([fetchSummary(), fetchGradingStats()]);
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    console.log("📦 Summary state updated:", summary);
  }, [summary]);

  const cards = [
    { label: "My Subjects",   value: summary.subjects,    icon: "fa-book",          link: "/my-courseware" },
    { label: "Live Classes",  value: summary.liveClasses, icon: "fa-video-camera",  link: "/instructor/live-classes" },
    { label: "Examinations",  value: summary.exams,       icon: "fa-file-text",     link: "/instructor/exams" },
    { label: "Assignments",   value: summary.assignments, icon: "fa-upload",        link: "/admin-manage-assignments" },
    { label: "Tasks",         value: summary.meetings,    icon: "fa-tasks",         link: "/taskboard" },
    { label: "Library Books", value: summary.books,       icon: "fa-book",          link: "/library" },
  ];

  return (
    <div id="main_content" className="font-muli theme-blush">
      {loading && (
        <div className="page-loader-wrapper">
          <div className="loader"></div>
        </div>
      )}

      <HeaderTop />
      <RightSidebar />
      <LeftSidebar role="Instructor" />

      <div className="section-wrapper">
        <div className="page admin-dashboard">
          <div className="section-body mt-3 pt-0">
            <div className="container-fluid">

              {/* Hero - same look as AdminDashboard */}
              <div className="jumbotron bg-light rounded shadow-sm mb-3 welcome-card dashboard-hero">
                <h2 className="page-title text-primary pt-0 dashboard-hero-title">
                  Welcome back, <strong>{instructorName}</strong> 👋
                </h2>
                <p className="text-muted mb-0 dashboard-hero-sub">
                  Here’s a quick snapshot of your teaching dashboard
                </p>
              </div>

              {/* Dashboard Cards - same size/style as AdminDashboard; whole card clickable */}
              <div className="row">
                {cards.map((item, idx) => (
                  <div className="col-12 col-sm-6 col-lg-3 mb-3" key={idx}>
                    <div
                      className="welcome-card dashboard-card animate-welcome text-center"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(item.link)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(item.link)}
                      style={{ cursor: "pointer" }}
                      aria-label={`Open ${item.label}`}
                      title={`Go to ${item.label}`}
                    >
                      <i className={`fa ${item.icon} dashboard-icon text-primary`} />
                      <div className="dashboard-label text-muted">{item.label}</div>
                      <div className="dashboard-count text-dark fw-bold">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grading Summary Section (kept; card style aligned) */}
              <div className="row mt-4">
                <div className="col-lg-6 col-md-12 mb-4">
                  <div className="welcome-card dashboard-card animate-welcome">
                    <h5 className="fw-bold mb-3">Grading Progress</h5>
                    <ul className="list-unstyled mb-4">
                      <li><strong>Total Submissions:</strong> {gradingStats.total}</li>
                      <li><strong>Graded:</strong> {gradingStats.graded}</li>
                      <li><strong>Pending:</strong> {gradingStats.pending}</li>
                    </ul>
                    <div className="progress" style={{ height: "24px" }}>
                      <div
                        className="progress-bar bg-success"
                        role="progressbar"
                        style={{ width: `${gradingStats.total ? (gradingStats.graded / gradingStats.total) * 100 : 0}%` }}
                      >
                        {gradingStats.graded}/{gradingStats.total} Graded
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6 col-md-12 mb-4">
                  <div className="welcome-card dashboard-card animate-welcome text-center">
                    <h5 className="fw-bold mb-3">Average Score</h5>
                    <p className="display-3 fw-bold text-primary" style={{ fontSize: "3rem", lineHeight: "normal" }}>
                      {gradingStats.averageScore} / 100
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default InstructorDashboard;
