import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import HeaderTop from "../components/HeaderTop";
import RightSidebar from "../components/RightSidebar";
import LeftSidebar from "../components/LeftSidebar";
import Footer from "../components/Footer";
import { Collapse } from "react-bootstrap";
import { FaChevronDown, FaChevronUp, FaBookOpen } from "react-icons/fa";
import API_BASE_URL from "../config";

function InstructorCourses() {
  const [groupedCourses, setGroupedCourses] = useState({});
  const [loading, setLoading] = useState(true);
  const [openSemesters, setOpenSemesters] = useState({});
  const [allOpen, setAllOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null); // <-- store userId

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const decoded = jwtDecode(token);
        console.log("📦 Decoded Token:", decoded);

        const role =
          decoded[
          "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ] || decoded.role;
        setUserRole(role);

        const decodedId = decoded.UserId || decoded.userId;
        setUserId(decodedId); // <-- keep userId in state
        const instructorId = decodedId;

        console.log("👨‍🏫 User ID:", decodedId);
        console.log("🎓 Role:", role);

        const res = await fetch(
          `${API_BASE_URL}/course/by-instructor/${instructorId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`, // ✅ Attach JWT token here
            },
          }
        );
        const data = await res.json();
        console.log("📚 Fetched courses:", data);

        const grouped = {};
        data.forEach((course) => {
          const key = `${course.batchName}-${course.board}-${course.class}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(course);
        });

        console.log("📘 Grouped courses:", grouped);
        setGroupedCourses(grouped);

        const initialOpen = {};
        Object.keys(grouped).forEach((key) => {
          initialOpen[key] = true;
        });
        setOpenSemesters(initialOpen);
      } catch (err) {
        console.error("❌ Failed to fetch instructor courses", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const toggleSemester = (key) => {
    console.log("🔄 Toggling semester:", key);
    setOpenSemesters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    console.log("📂 Toggle All Semesters");
    const newState = {};
    Object.keys(openSemesters).forEach((key) => {
      newState[key] = !allOpen;
    });
    setOpenSemesters(newState);
    setAllOpen(!allOpen);
  };

  const filterCourses = (courses) => {
    console.log("🔍 Search Term:", searchTerm);
    return courses.filter((c) =>
      `${c.paperCode} ${c.paperName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  };

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
        <div className="page admin-dashboard pt-0">
          <div className="section-body mt-2 pt-0">
            <div className="container-fluid">
              <div className="card-body">
                <div className="jumbotron bg-light rounded shadow-sm mb-3 welcome-card dashboard-hero">
                  <h2 className="page-title text-primary pt-0 dashboard-hero-title">
                    <i className="fa-solid fa-book-open"></i> My Courseware
                  </h2>
                  <p className="text-muted mb-0 dashboard-hero-sub">
                    View and Manage your Subjects below
                  </p>
                </div>

                {Object.keys(groupedCourses).length > 0 && (
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={toggleAll}
                      title={allOpen ? "Collapse all" : "Expand all"}
                      aria-label={allOpen ? "Collapse all" : "Expand all"}
                    >
                      {allOpen ? (
                        <i className="fa-solid fa-minimize" />
                      ) : (
                        <i className="fa-solid fa-maximize" />
                      )}
                    </button>

                    <input
                      type="text"
                      className="form-control form-control-sm"
                      style={{ width: "250px" }}
                      placeholder="Search by Subject Name or Code"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                )}

                {Object.entries(groupedCourses).map(([key, courses]) => {
                  const filtered = filterCourses(courses);
                  console.log("🎯 Filtered courses for key:", key, filtered);
                  if (filtered.length === 0) return null;

                  return (
                    <div key={key} className="mb-4">
                      <button
                        className="semester-toggle-btn w-100 text-left d-flex justify-content-between align-items-center"
                        onClick={() => toggleSemester(key)}
                        aria-controls={`collapse-${key}`}
                        aria-expanded={!!openSemesters[key]}
                      >
                        <span>
                          <FaBookOpen className="me-2" /> {key} (
                          {filtered.length} Subjects)
                        </span>
                        {openSemesters[key] ? <FaChevronUp /> : <FaChevronDown />}
                      </button>

                      <Collapse in={openSemesters[key]}>
                        {/* 👇 give the opened panel its own scroll */}
                        <div
                          id={`collapse-${key}`}
                          className="p-3 mt-2 semester-panel-body"
                          tabIndex={-1}
                        >
                          {filtered.map((course) => (
                            <CourseCard
                              key={course.courseId}
                              course={course}
                              navigate={navigate}
                              role={userRole}
                              userId={userId} // <-- pass userId to card
                            />
                          ))}
                        </div>
                      </Collapse>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function CourseCard({ course, navigate, role, userId }) {
  const [details, setDetails] = useState({});

  const isStudent = role === "Student";

  // Small helper: safely read count keys
  const getCount = (obj, keys, fallback = 0) => {
    for (const k of keys) {
      if (obj && obj[k] != null) return obj[k];
    }
    return fallback;
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (!userId) return; // wait until userId available

        const token = localStorage.getItem("jwt");
        // ✅ Pass userId to stats API
        const url = `${API_BASE_URL}/Content/stats/${course.examinationID}?userId=${userId}`;

        console.log("📊 Loading stats:", { url });

        const res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
          console.log(
            "📊 Course stats for",
            course.examinationID,
            ":",
            data
          );
        } else {
          console.warn("⚠ Stats request not OK", res.status);
        }
      } catch (err) {
        console.error("❌ Error loading course details:", err);
      }
    };
    load();
  }, [course.examinationID, userId]);

  // ===== Stat configuration (video separated) =====
  const statsToRender = [];

  if (isStudent) {
    // 👉 Student: show ONLY single Video box
    const videoCount = getCount(details, ["videoCount", "VideoCount"]);
    statsToRender.push({
      key: "video",
      label: "Video",
      count: videoCount,
    });
  } else {
    // 👉 Non-students: split only Video into S_Video & O_Video
    const sVideoCount = getCount(
      details,
      ["sVideoCount", "SVideoCount", "studentVideoCount", "s_videoCount"]
    );
    const oVideoCount = getCount(
      details,
      ["oVideoCount", "OVideoCount", "otherVideoCount", "o_videoCount"]
    );

    statsToRender.push({
      key: "s_video",
      label: "S_Video",
      count: sVideoCount,
    });
    statsToRender.push({
      key: "o_video",
      label: "F_Video",
      count: oVideoCount,
    });
  }

  // ⭐ Remaining stats "as usual" - NOW VISIBLE FOR ALL ROLES
  statsToRender.push({
    key: "ebook",
    label: "E-Book",
    count: getCount(details, ["ebookCount", "EBookCount"]),
  });
  statsToRender.push({
    key: "web",
    label: "Web Resource",
    count: getCount(details, ["webCount", "webResourceCount"]),
  });
  statsToRender.push({
    key: "pa",
    label: "Practice Test",
    count: getCount(details, ["paCount", "practiceTestCount"]),
  });
  statsToRender.push({
    key: "live",
    label: "Live Class",
    count: getCount(details, ["livecount", "liveCount"]),
  });
  statsToRender.push({
    key: "disc",
    label: "Discussions",
    count: getCount(details, ["discussionCount"]),
  });

  // ===== Inline styles for nice stat boxes =====
  const statContainerStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
  };

  const statItemStyle = {
    flex: "1 1 120px",
    minWidth: "120px",
    maxWidth: "150px",
    background: "#f8f9ff",
    borderRadius: "10px",
    padding: "10px 8px",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  };

  const statCountStyle = {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#1d4ed8",
    marginBottom: "4px",
  };

  const statLabelStyle = {
    fontSize: "0.78rem",
    fontWeight: 500,
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  };

  return (
    <div className="course-card welcome-card animate-welcome">
      <div className="course-header">
        <h1
          className="course-title"
          style={{ fontSize: "1.25rem", fontWeight: "600" }}
        >
          {course.paperCode} - {course.paperName}
        </h1>
        <div className="course-btn-group">
          <button
            className="btn btn-sm btn-outline-success"
            onClick={() => {
              console.log("➡️ Navigating to view content for:", course);
              window.scrollTo({ top: 0, behavior: "smooth" });
              navigate(`/view-course-content/${course.examinationID}`, {
                state: {
                  examinationID: course.examinationID,
                  paperCode: course.paperCode,
                  paperName: course.paperName,
                  batchName: course.batchName,
                  name: course.name,
                  semester: course.semester,
                  class: course.class,
                },
              });
            }}
          >
            <i className="fas fa-eye me-1"></i> View
          </button>

          {role === "Admin" && (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => {
                console.log("🆙 Navigating to upload content for:", course);
                navigate(
                  `/admin/upload-course-content/${course.examinationID}`,
                  {
                    state: {
                      paperCode: course.paperCode,
                      paperName: course.paperName,
                      batchName: course.batchName,
                      semester: course.semester,
                      name: course.name,
                    },
                  }
                );
              }}
            >
              <i className="fas fa-upload me-1"></i> Upload
            </button>
          )}
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-7">
          <div className="course-info-box welcome-card animate-welcome">
            <h6 className="course-info-title mb-3">
              <i className="fas fa-book-open me-2"></i>Courseware
            </h6>

            {/* ⭐ Neatly aligned stat boxes */}
            <div
              className="course-stats-container"
              style={statContainerStyle}
            >
              {statsToRender.map((stat) => (
                <div
                  key={stat.key}
                  className="course-stat-item"
                  style={statItemStyle}
                >
                  <div
                    className="course-stat-count"
                    style={statCountStyle}
                  >
                    {stat.count || 0}
                  </div>
                  <div
                    className="course-stat-label"
                    style={statLabelStyle}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-md-5">
          <div className="course-info-box welcome-card animate-welcome">
            <h6 className="course-info-title">
              <i className="fas fa-chalkboard-teacher me-2"></i>Schedules
            </h6>
            {details.upLiveClass || details.upAExam || details.upTExam ? (
              <>
                {details.upLiveClass && (
                  <p className="text-muted mb-0">
                    <strong>Live Class:</strong>{" "}
                    {new Date(details.upLiveClass)
                      .toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                      .replace(",", "")}
                  </p>
                )}
                {details.upAExam && (
                  <p className="text-muted mb-0">
                    <strong>Assignment:</strong>{" "}
                    {new Date(details.upAExam)
                      .toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                      .replace(",", "")}
                  </p>
                )}
                {details.upTExam && (
                  <p className="text-muted mb-0">
                    <strong>Theory Exam:</strong>{" "}
                    {new Date(details.upTExam)
                      .toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                      .replace(",", "")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted mb-0">Nothing scheduled</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstructorCourses;
