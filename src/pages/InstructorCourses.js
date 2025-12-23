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
                          <div className="row">
                            {filtered.map((course) => (
                              <div key={course.courseId} className="col-md-6 col-lg-4 col-xl-3 mb-4">
                                <CourseCard
                                  course={course}
                                  navigate={navigate}
                                  role={userRole}
                                  userId={userId}
                                />
                              </div>
                            ))}
                          </div>
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

  const getCount = (obj, keys, fallback = 0) => {
    for (const k of keys) {
      if (obj && obj[k] != null) return obj[k];
    }
    return fallback;
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (!userId) return;

        const token = localStorage.getItem("jwt");
        const url = `${API_BASE_URL}/Content/stats/${course.examinationID}?userId=${userId}`;

        const res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
        }
      } catch (err) {
        console.error("❌ Error loading course details:", err);
      }
    };
    load();
  }, [course.examinationID, userId]);

  const statsToRender = [];

  if (isStudent) {
    const videoCount = getCount(details, ["videoCount", "VideoCount"]);
    statsToRender.push({
      key: "video",
      label: "Video",
      count: videoCount,
      icon: "fa-video",
      color: "text-primary"
    });
  } else {
    const sVideoCount = getCount(details, ["sVideoCount", "SVideoCount", "studentVideoCount", "s_videoCount"]);
    const oVideoCount = getCount(details, ["oVideoCount", "OVideoCount", "otherVideoCount", "o_videoCount"]);

    statsToRender.push({
      key: "s_video",
      label: "S_Video",
      count: sVideoCount,
      icon: "fa-video",
      color: "text-info"
    });
    statsToRender.push({
      key: "o_video",
      label: "F_Video",
      count: oVideoCount,
      icon: "fa-film",
      color: "text-secondary"
    });
  }

  statsToRender.push({
    key: "ebook",
    label: "E-Book",
    count: getCount(details, ["ebookCount", "EBookCount"]),
    icon: "fa-book",
    color: "text-success"
  });
  statsToRender.push({
    key: "web",
    label: "Web Resource",
    count: getCount(details, ["webCount", "webResourceCount"]),
    icon: "fa-globe",
    color: "text-warning"
  });
  statsToRender.push({
    key: "pa",
    label: "Practice Test",
    count: getCount(details, ["paCount", "practiceTestCount"]),
    icon: "fa-pencil-alt",
    color: "text-danger"
  });
  statsToRender.push({
    key: "live",
    label: "Live Class",
    count: getCount(details, ["livecount", "liveCount"]),
    icon: "fa-broadcast-tower",
    color: "text-primary"
  });
  statsToRender.push({
    key: "disc",
    label: "Discussions",
    count: getCount(details, ["discussionCount"]),
    icon: "fa-comments",
    color: "text-success"
  });

  // Updated styles for cleaner layout
  const statContainerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "3px", // Tighter gap
    marginTop: "10px"
  };

  const statItemStyle = {
    background: "rgba(255, 255, 255, 0.5)",
    borderRadius: "6px",
    padding: "4px 1px", // Very compact padding
    textAlign: "center",
    border: "1px solid rgba(0, 0, 0, 0.14)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
    minHeight: "45px" // Enforce a small but consistent height
  };

  const statCountStyle = {
    fontSize: "0.85rem", // Smaller count
    fontWeight: 700,
    color: "#2d3748",
    lineHeight: "1.1",
    marginBottom: "1px" // slight separation
  };

  const statLabelStyle = {
    fontSize: "0.55rem", // Smaller label
    fontWeight: 600,
    color: "#718096",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    width: "100%",
    padding: "0" // No extra padding
  };

  return (
    <div
      className="card h-100 border-0"
      style={{
        borderRadius: "16px",
       background: "linear-gradient(135deg, #eaf2fb, #ffffff)",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.5)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="card-body p-3 d-flex flex-column">

        {/* Header Section */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div style={{ minWidth: 0, paddingRight: '10px' }}>
            <h6 className="font-weight-bold mb-0 text-dark text-truncate" style={{ fontSize: "1rem", letterSpacing: "-0.01em" }}  title={course.paperName}>
              {course.paperName}
            </h6>
            <small className="text-muted d-block text-truncate" style={{ fontSize: "0.8rem", marginTop: '2px' }} title={course.paperCode + ' - ' + course.paperName}>
              {course.paperCode}
            </small>
            
          </div>
          <div className="d-flex flex-column gap-1 flex-shrink-0">
            <button
              className="btn btn-xs btn-outline-success rounded-pill px-3 py-1"
              style={{ fontSize: "0.75rem", fontWeight: "600" }}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                navigate(`/view-course-content/${course.examinationID}`, {
                  state: { ...course },
                });
              }}
            >
              View
            </button>

            {role === "Admin" && (
              <button
                className="btn btn-xs btn-outline-primary rounded-pill px-3 py-1 mt-1"
                style={{ fontSize: "0.75rem", fontWeight: "600" }}
                onClick={() => {
                  navigate(`/admin/upload-course-content/${course.examinationID}`, {
                    state: { ...course },
                  });
                }}
              >
                Upload
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex-grow-1">
          <div style={statContainerStyle}>
            {statsToRender.map((stat) => (
              <div key={stat.key} style={statItemStyle}>
                <div style={statCountStyle}>{stat.count || 0}</div>
                <div style={statLabelStyle} title={stat.label}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule Footer */}
        <div className="mt-3 pt-3 border-top" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <small className="text-secondary font-weight-bold d-block mb-1" style={{ fontSize: "0.7rem", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upcoming</small>
          <div style={{ fontSize: "0.75rem" }}>
            {details.upLiveClass || details.upAExam || details.upTExam ? (
              <>
                {details.upLiveClass && (
                  <div className="d-flex align-items-center mb-1 text-primary">
                    <span style={{ width: '16px', display: 'flex', justifyContent: 'center' }} className="me-2"><i className="fas fa-video"></i></span>
                    <span className="text-truncate" title={new Date(details.upLiveClass).toLocaleString()}>
                      {new Date(details.upLiveClass).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true
                      })}
                    </span>
                  </div>
                )}
                {details.upAExam && (
                  <div className="d-flex align-items-center mb-1 text-warning">
                    <span style={{ width: '16px', display: 'flex', justifyContent: 'center' }} className="me-2"><i className="fas fa-file-alt"></i></span>
                    <span className="text-truncate" title={new Date(details.upAExam).toLocaleString()}>
                      {new Date(details.upAExam).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true
                      })}
                    </span>
                  </div>
                )}
                {details.upTExam && (
                  <div className="d-flex align-items-center text-danger">
                    <span style={{ width: '16px', display: 'flex', justifyContent: 'center' }} className="me-2"><i className="fas fa-edit"></i></span>
                    <span className="text-truncate" title={new Date(details.upTExam).toLocaleString()}>
                      {new Date(details.upTExam).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true
                      })}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted font-italic" style={{ fontSize: "0.75rem" }}>No upcoming schedules</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default InstructorCourses;
