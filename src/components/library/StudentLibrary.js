import React, { useState, useEffect } from "react";
import HeaderTop from "../HeaderTop";
import LeftSidebar from "../LeftSidebar";
import Footer from "../Footer";
import StudentLibraryTable from "./StudentLibraryTable";
import API_BASE_URL from "../../config";


function StudentLibrary() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading completion after a short delay (or actual data fetch)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800); // You can adjust this duration or replace with real data fetching

    return () => clearTimeout(timer);
  }, []);

  return (
    <div id="main_content" className="font-muli theme-blush">
      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          <HeaderTop />
          <LeftSidebar />

          <div className="page">
            <div className="section-body mt-3">
              <div className="container-fluid">
                <div className="p-4 mb-4 welcome-card animate-welcome">
              <h2 className="page-title text-primary">
                <i class="fa-solid fa fa-archive"></i> Library Management
              </h2>
              <p className="text-muted mb-0">
                View and manage your Library resources
              </p>
            </div>

                <div className="card shadow-sm mb-4">
                  <div className="card-body welcome-card animate-welcome">
                    <div className="tab-content mt-3">
                      <div className="tab-pane fade show active">
                        <StudentLibraryTable />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Footer />
          </div>
        </>
      )}
    </div>
  );
}

export default StudentLibrary;
