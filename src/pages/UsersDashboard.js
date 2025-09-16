

// File: src/pages/UsersDashboard.jsx
import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import HeaderTop from "../components/HeaderTop";
import RightSidebar from "../components/RightSidebar";
import LeftSidebar from "../components/LeftSidebar";
import Footer from "../components/Footer";
import API_BASE_URL from "../config";

function UsersDashboard() {
  const [summary, setSummary] = useState({
    students: 0,
    professors: 0,
    
  }); 
  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const role = decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      const name = decoded["Username"] || decoded.name || "Admin";
      setAdminName(name);

      if (role !== "Admin") {
        setLoading(false);
        return;
      }

      const fetchSummary = async () => {
        try {
          const token = localStorage.getItem("jwt");
          const res = await fetch(`${API_BASE_URL}/AdminSummary/dashboard`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          const data = await res.json();
          setSummary({
            students: data.students || 0,
            professors: data.professors || 0,
            users : data.users || 0,
          });
          console.log(data);
        } catch (err) {
          console.error("Failed to fetch dashboard summary", err);
        } finally {
          setLoading(false);
        }
      };

      fetchSummary();
    } catch (err) {
      console.error("Token decode error", err);
      setLoading(false);
    }
  }, []);


  // useEffect(() => {
  //   if (summary) fetchSummary();
  // }, [summary]);


  return (
    <div id="main_content" className="font-muli theme-blush">
      {loading && (
        <div className="page-loader-wrapper">
          <div className="loader" />
        </div>
      )}

      <HeaderTop />
      <RightSidebar />
      <LeftSidebar role="Admin" />

      <div className="page">
        <div className="section-body mt-3">
          <div className="container-fluid">

            {/* Welcome Header */}
             <div className="jumbotron bg-light p-4 rounded shadow-sm mb-4 welcome-card animate-welcome">
                          <h2 className="page-title text-primary">
                           <i class="fa-solid fa-user-secret"></i> Manage Users
                          </h2>
                          <p className="text-muted mb-0">
                            View and Manage all Users in LMS
                          </p>
                        </div>

            {/* Dashboard Cards */}
            <div className="row d-flex justify-content-center">
              {[

                 { label: "Students", value: summary.students, icon: "fa-user", link: "/students" },

                { label: "Professors", value: summary.professors, icon: "fa-user-tie", link: "/professors" },
                
                 { label: "Others", value: summary.users, icon: "fa-users", link: "/admin-users" },
                
                
              ].map((item, idx) => (
                <div className="col-12 col-sm-6 col-lg-3 mb-4" key={idx}>
                  {/* <div className="card h-100 border-0 shadow-sm rounded"> */}
                    <div className="card-body text-center welcome-card animate-welcome">

                      {/* Icon */}
                      <div className="card-body text-center">
                        <i className={`fa ${item.icon} fa-3x mb-2 text-primary`} />
                      </div>

                      {/* Label & Count */}
                      {/* <h6 className="text-muted mb-1">{item.label}</h6> */}
                      <h3 className="text-dark fw-bold">{item.value}</h3>

                      {/* Manage Link */}
                      <a
                        href={item.link}
                        className="badge text-primary px-3 py-2 rounded-pill mt-2 text-decoration-none"
                      >
                        <h6>{item.label} <i className="fa fa-caret-right mr-1"></i></h6>
                      </a>
                    </div>
                  </div>
                // </div>
              ))}
            </div>

          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default UsersDashboard;
