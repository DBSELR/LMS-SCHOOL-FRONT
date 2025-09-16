import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import HeaderTop from "../components/HeaderTop";
import RightSidebar from "../components/RightSidebar";
import LeftSidebar from "../components/LeftSidebar";
import Footer from "../components/Footer";
import { Modal, Button } from "react-bootstrap";
import API_BASE_URL from "../config";

function StudentDashboard() {
  const [studentId, setStudentId] = useState(null);
  const [summary, setSummary] = useState({
    subjects: 0,
    assignments: 0,
    attendance: 0,
    fees: 0,
    exams: 0,
    books: 0,
    tests: 0,
    liveClasses: 0,
    supportTickets: 0,
    studentName: "",
  });
  const [loading, setLoading] = useState(true);
  const [liveClassNotifications, setLiveClassNotifications] = useState([]);
  const [examNotifications, setExamNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/StudentSummary/dashboard/${studentId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      setSummary({
        subjects: data.subjects || 0,
        assignments: data.assignments || 0,
        attendance: data.attendance || 0,
        fees: data.fees || 0,
        exams: data.exams || 0,
        books: data.books || 0,
        tests: data.tests || 0,
        liveClasses: data.liveClasses || 0,
        supportTickets: data.supportTickets || 0,
        studentName: data.studentName || "Student",
      });
    } catch (err) {
      console.error("Summary fetch failed", err);
    }
  };

  const fetchLiveClasses = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/LiveClass/Student/${studentId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const now = new Date();
        const liveNotifs = data
          .filter(cls => {
            if (!cls || !cls.liveDate) return false;
            const [year, month, day] = cls.liveDate.split("T")[0].split("-");
            const [startHour, startMinute] = cls.startTime.split(":").map(Number);
            const [endHour, endMinute] = cls.endTime.split(":").map(Number);
            const startDateTime = new Date(year, month - 1, day, startHour, startMinute);
            const endDateTime = new Date(year, month - 1, day, endHour, endMinute);
            const joinStartTime = new Date(startDateTime.getTime() - 10 * 60 * 1000);
            return now < joinStartTime || (now >= joinStartTime && now <= endDateTime);
          })
          .map(cls => {
            const [year, month, day] = cls.liveDate.split("T")[0].split("-");
            const [startHour, startMinute] = cls.startTime.split(":").map(Number);
            const startDateTime = new Date(year, month - 1, day, startHour, startMinute);

            let status;
            if (now < new Date(startDateTime.getTime() - 10 * 60 * 1000)) {
              status = "Schedule";
            } else if (now >= new Date(startDateTime.getTime() - 10 * 60 * 1000) && now <= new Date(cls.liveDate.split("T")[0] + "T" + cls.endTime)) {
              status = "Live Now";
            } else {
              status = "Completed";
            }

            return {
              category: "Live Class",
              message: `${cls.className} with ${cls.instructorName || "-"}`,
              status: status,
              dateSent: startDateTime,
            };
          });

        setLiveClassNotifications(liveNotifs);
      }
    } catch (err) {
      console.error("Live classes fetch failed", err);
    }
  };

  const fetchExams = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/InstructorExam/StudentExam/${studentId}`, {
        
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const now = new Date();
        const examNotifs = data
          .map(exam => {
            const createdAt = new Date(exam.createdAt);
            const examDate = new Date(exam.examDate);
            const endDate = new Date(exam.examDate);
            endDate.setMinutes(endDate.getMinutes() + exam.durationMinutes);

            let status;
            if (exam.examType === "MA" || exam.examType === "DA") {
              status = now < createdAt ? "Upcoming" : now > examDate ? "Closed" : "Open";
            } else if (exam.examType === "MT" || exam.examType === "DT") {
              status = now < examDate ? "Upcoming" : now > endDate ? "Closed" : "Open";
            } else {
              status = "Unknown";
            }

            return {
              category: "Exam",
              message: `${exam.title}`,
              status,
              dateSent: examDate,
            };
          })
          .filter(exam => exam.status !== "Closed");

        setExamNotifications(examNotifs);
      }
    } catch (err) {
      console.error("Exams fetch failed", err);
    }
  };

  const formatDateCustom = (dateObj) => {
    return dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(/ /g, " ") + " - " + dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      setLoading(false);
      return;
    }
    const decoded = jwtDecode(token);
    const id = decoded["UserId"] || decoded.userId;
    setStudentId(id);
  }, []);

  useEffect(() => {
    if (studentId) {
      const fetchAll = async () => {
        setLoading(true);
        try {
          await Promise.all([fetchSummary(), fetchLiveClasses(), fetchExams()]);
        } catch (err) {
          console.error("Dashboard data load error", err);
        } finally {
          setLoading(false);
        }
      };

      fetchAll();
      const interval = setInterval(fetchAll, 30000);
      return () => clearInterval(interval);
    }
  }, [studentId]);

  const allNotifications = [...liveClassNotifications, ...examNotifications].sort(
    (a, b) => new Date(b.dateSent) - new Date(a.dateSent)
  );

  return (
    <div id="main_content" className="font-muli theme-blush">
      {loading && <div className="page-loader-wrapper"><div className="loader"></div></div>}

      <HeaderTop />
      <RightSidebar />
      <LeftSidebar role="Student" />

      <div className="page">
        <div className="section-body mt-3">
          <div className="container-fluid">
            <div className="row mt-4">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-primary text-white d-flex align-items-center">
                    <i className="fa fa-bell mr-2"></i>
                    <h6 className="mb-0">Latest Notifications</h6>
                    <button className="btn btn-sm btn-light ml-auto" onClick={() => setShowModal(true)}>
                      View All
                    </button>
                  </div>
                  <div className="card-body p-2 position-relative" style={{ height: "140px", overflow: "hidden", background: "#f9f9f9" }}>
                    {allNotifications.length > 0 ? (
                      <div className="scrolling-container">
                        {allNotifications.map((note, index) => {
                          const isLive = note.status === "Live Now" || note.status === "Open";
                          const isSchedule = note.status === "Schedule" || note.status === "Upcoming";
                          return (
                            <span key={index} className={`notif-item ${isLive ? "live-anim" : ""}`}>
                              <i className={`fa ${note.category === "Exam" ? "fa-file" : "fa-video-camera"} text-primary mr-1`}></i>
                              <strong>{note.category}</strong> — {note.message}{" "}
                              {isLive && <span className="badge badge-success ml-1 live-badge">{note.status}</span>}
                              {isSchedule && <span className="badge badge-warning ml-1">{note.status}</span>}
                              <span className="small text-muted"> ({formatDateCustom(new Date(note.dateSent))})</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted mb-0">No Notifications.</p>
                    )}
                  </div>
                </div>
              </div>

              <style>
                {`
                  .scrolling-container {
                    display: flex;
                    flex-direction: column;
                    animation: scrollUp 8s linear infinite;
                  }
                  .notif-item {
                    display: block;
                    margin-bottom: 10px;
                    padding: 5px 10px;
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 20px;
                    box-shadow: 0 1px 3px rgba(15, 7, 239, 0.42);
                  }
                  @keyframes scrollUp {
                    0% { transform: translateY(30%); }
                    100% { transform: translateY(-100%); }
                  }
                  .card-body:hover .scrolling-container {
                    animation-play-state: paused;
                  }
                  @keyframes zoomInOut {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                  }
                  .live-anim .live-badge {
                    animation: zoomInOut 1s infinite;
                  }
                `}
              </style>
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>All Notifications</Modal.Title>
              </Modal.Header>
              <Modal.Body style={{ maxHeight: "400px", overflowY: "auto" }}>
                {allNotifications.length > 0 ? (
                  <ul className="list-group">
                    {allNotifications.map((note, index) => (
                      <li key={index} className="list-group-item">
                        <i className={`fa ${note.category === "Exam" ? "fa-file" : "fa-video-camera"} text-primary mr-1`}></i>
                        <strong>{note.category}</strong> — {note.message}
                        <span className={`badge ml-2 ${note.status === "Live Now" || note.status === "Open" ? "badge-success" : "badge-warning"}`}>
                          {note.status}
                        </span>
                        <div className="small text-muted">{formatDateCustom(new Date(note.dateSent))}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No Notifications.</p>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
              </Modal.Footer>
            </Modal>

            {/* Summary Cards */}
            <div className="row">
              {[
                { label: "My Subjects", value: summary.subjects, icon: "fa-book", link: "/courses" },
                { label: "Live Classes", value: summary.liveClasses, icon: "fa-video-camera", link: "/student/live-classes" },
                { label: "Examinations", value: summary.exams, icon: "fa-file", link: "/student-examinations" },
                { label: "Assignments", value: summary.assignments, icon: "fa-file-text", link: "/student-submissions" },
                { label: "Library Books", value: summary.books, icon: "fa-book", link: "/library" },
                { label: "Fees", value: summary.fees, icon: "fa-credit-card", link: "/fees/student" },
                { label: "Support Tickets", value: summary.supportTickets, icon: "fa-headphones", link: "/student/support-tickets" }
              ].map((item, idx) => (
                <div className="col-12 col-sm-6 col-lg-3 mb-4" key={idx}>
                  <div className="welcome-card animate-welcome h-100 border-0">
                    <div className="card-body text-center position-relative">
                      <div className="card-body text-center">
                        <i className={`fa ${item.icon} fa-2x mb-2 text-primary`} />
                      </div>
                      <h6 className="text-muted mb-1">{item.label}</h6>
                      <h2 className="text-dark fw-bold">{item.value}</h2>
                      <a href={item.link} className="badge text-primary px-3 py-2 rounded-pill mt-2 text-decoration-none">
                        View {item.label} <i className="fa fa-arrow-right mr-1"></i>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default StudentDashboard;
