import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import '../App.css';


function LeftSidebar({ role: propRole }) {
  const [userName, setUserName] = useState("User");
  const [role, setRole] = useState(propRole || "");
  const location = useLocation();

  useEffect(() => {
    // Set sidebar open by default on all devices
    document.body.classList.add('sidebar-open');
    
    const token = localStorage.getItem("jwt");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const resolvedRole =
          decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || decoded.role;
        const name =
          decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
          decoded["Username"] ||
          decoded.name ||
          "User";

        setRole(resolvedRole);
        setUserName(name);
      } catch (err) {
        console.error("Token decode failed", err);
      }
    }
  }, []);

  // Ensure sidebar remains open when navigating between pages
  useEffect(() => {
    document.body.classList.add('sidebar-open');
  }, [location.pathname]);

  // Add click outside to close sidebar on mobile only
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only apply this behavior on mobile devices (screen width <= 767px)
      if (window.innerWidth <= 767) {
        const sidebar = document.getElementById('left-sidebar');
        const isClickInsideSidebar = sidebar && sidebar.contains(event.target);
        const isMenuToggleClick = event.target.closest('.menu_toggle');
        
        // Close sidebar if click is outside sidebar and not on menu toggle button
        if (!isClickInsideSidebar && !isMenuToggleClick) {
          document.body.classList.remove('sidebar-open');
        }
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup event listener on unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const menuItemsByRole = {
    Student: [
      { icon: "fa fa-dashboard", label: "Dashboard", href: "/student-dashboard" },
      { icon: "fa fa-book-open", label: "Courseware", href: "/my-courseware" },
      { icon: "fa fa-pencil", label: "Subject List", href: "/student-examinations" },
      { icon: "fa fa-file-pen", label: "Exams", href: "/student-exams" },
      { icon: "fa fa-archive", label: "Library", href: "/studentlibrary" }, 
      { icon: "fa fa-bar-chart", label: "My Submissions", href: "/student-submissions" },
      { icon: "fa fa-check-circle", label: "My Progress", href: "/student/attendance" },
      { icon: "fa fa-calendar", label: "Calendar", href: "/events" },
      { icon: "fa fa-video-camera", label: "Live Classes", href: "/student/live-classes" },
      { icon: "fa fa-credit-card", label: "Fee Status", href: "/fees/student" },
      { icon: "fa fa-headset", label: "Support", href: "/student/support-tickets" },
    ],
    Faculty: [
      { icon: "fa fa-dashboard", label: "Dashboard", href: "/instructor-dashboard" },
      { icon: "fa fa-user-graduate", label: " Add Students", href: "/students" },
      { icon: "fa fa-archive", label: "Library", href: "/library" },
      { icon: "fa fa-book-open", label: "My Courseware", href: "/my-courseware" },
      { icon: "fa fa-video-camera", label: "Live Classes", href: "/instructor/live-classes" },
      { icon: "fa fa-file-pen", label: "Manage Exam", href: "/instructor/exams" },
      { icon: "fa fa-video-camera", label: "Assignments", href: "/instructor/assignments/grade-list" },
      { icon: "fa fa-bar-chart", label: "Grade Exam", href: "/instructor/grade-list" },
      { icon: "fa fa-comment", label: "Add Discussions", href: "/adddiscussions" },
      { icon: "fa fa-list-alt", label: "Taskboard", href: "/taskboard" },
    ],
    SRO: [
      { icon: "fa fa-dashboard", label: "Dashboard", href: "/sro-dashboard" },
      { icon: "fa fa-ticket", label: "Support Tickets", href: "/instructor/support-tickets" },
      { icon: "fa fa-tasks", label: "Taskboard", href: "/taskboard" },
    ],
    Admin: [
      { icon: "fa fa-dashboard", label: "Dashboard", href: "/admin-dashboard" },
      { icon: "fa fa-university", label: "Departments", href: "/departments" },
      { icon: "fa fa-book", label: "Board Master", href: "/AdminDashboardTabs" },
      { icon: "fa fa-book-open", label: "Courseware", href: "/my-courseware" },
      { icon: "fa fa-user-secret", label: "Manage Users", href: "/users-dashboard" },
      { icon: "fa fa-line-chart", label: "Student Progress", href: "/AdminStudentOverview" },
      { icon: "fa fa-chalkboard-teacher", label: "Assign SRO", href: "/mentor-assign" },
      { icon: "fa fa-comment", label: "Add Discussions", href: "/adddiscussions" },
      { icon: "fa fa-archive", label: "Library", href: "/library" },
      { icon: "fa fa-list-alt", label: "Role Menu Mapping", href: "/role-menu-mapping" },
      { icon: "fa fa-video-camera", label: "Live Classes", href: "/instructor/live-classes" },
      { icon: "fa fa-file-pen", label: "Manage Exam", href: "/admin-exams" },
      { icon: "fa fa-credit-card", label: "Payments", href: "/payments" },
      { icon: "fa fa-file", label: "Reports", href: "/AdminReportsDashboard" },
      { icon: "fa fa-list-alt", label: "Taskboard", href: "/taskboard" },
      { icon: "fa fa-headset", label: "Support", href: "/instructor/support-tickets" },
    ],
    Business_Executive: [
      { icon: "fa fa-dashboard", label: "Dashboard", href: "/admin-dashboard" },
      { icon: "fa fa-university", label: "Departments", href: "/departments" },
      { icon: "fa fa-book", label: "Board Master", href: "/AdminDashboardTabs" },
      { icon: "fa fa-book-open", label: "Courseware", href: "/my-courseware" },
      { icon: "fa fa-user-secret", label: "Manage Users", href: "/users-dashboard" },
      { icon: "fa fa-line-chart", label: "Student Progress", href: "/AdminStudentOverview" },
      { icon: "fa fa-chalkboard-teacher", label: "Assign SRO", href: "/mentor-assign" },
      { icon: "fa fa-comment", label: "Add Discussions", href: "/adddiscussions" },
      { icon: "fa fa-archive", label: "Library", href: "/library" },
      { icon: "fa fa-list-alt", label: "Role Menu Mapping", href: "/role-menu-mapping" },
      { icon: "fa fa-video-camera", label: "Live Classes", href: "/instructor/live-classes" },
      { icon: "fa fa-file-pen", label: "Manage Exam", href: "/admin-exams" },
      { icon: "fa fa-credit-card", label: "Payments", href: "/payments" },
      { icon: "fa fa-file", label: "Reports", href: "/AdminReportsDashboard" },
      { icon: "fa fa-list-alt", label: "Taskboard", href: "/taskboard" },
      { icon: "fa fa-headset", label: "Support", href: "/instructor/support-tickets" },
    ],
  };

  const menuItems = menuItemsByRole[role] || [];

  // Function to handle menu item click (sidebar stays open on all devices)
  const handleMenuItemClick = () => {
    // Sidebar remains open by default - no action needed
    // This function can be used for future menu item specific actions
  };

  return (
    <div id="left-sidebar" className="sidebar" style={{ paddingTop: "10px" }}>
      <div className="sidebar-header" style={{ padding: 0, paddingLeft: "20px" }}>
        <h5 className="brand-name d-flex align-items-center">
          <img src="/assets/EdVedha-Logo.png" alt="logo" height="32" />
        </h5>
      </div>

      <div className="sidebar-welcome" style={{ padding: "0px" }}>
        <div
          className="welcome-card animate-welcome"
          style={{
            minHeight: "0px",
            margin: "auto",
            alignItems: "center",
            textAlign: "center",
            marginTop: "5px",
            marginBottom: "5px",
          }}
        >
          <div className="text-center" style={{ padding: "0px" }}>
            <div className="welcome-name">{userName} - ({role})</div>
          </div>
        </div>
      </div>

      <div>
        <nav className="sidebar-nav">
          <ul className="metismenu">
            {menuItems.map((item, index) => {
              const isCoursewareActive =
                item.href === "/my-courseware" &&
                (
                  location.pathname === "/my-courseware" ||
                  location.pathname.startsWith("/view-course-content") ||
                  location.pathname.startsWith("/instructor/upload-course-content")
                );

              // const isManageUsersActive =
              //   item.href === "/users-dashboard" &&
              //   location.pathname.startsWith("/students");
const isManageUsersActive =
  item.href === "/users-dashboard" &&
  (location.pathname.startsWith("/students") || location.pathname.startsWith("/professors")|| location.pathname.startsWith("/admin-users"));

              const isActive =
                isCoursewareActive || location.pathname === item.href || isManageUsersActive;

              return (
                <li key={index}>
                  <NavLink
                    to={item.href}
                    className={`d-flex align-items-center ${isActive ? "fw-bold text-primary" : ""}`}
                    onClick={handleMenuItemClick}
                  >
                    <i className={`${item.icon} mr-2`}></i>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default LeftSidebar;
