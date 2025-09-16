import React, { useState, useEffect } from "react";
import HeaderTop from "../components/HeaderTop";
import RightSidebar from "../components/RightSidebar";
import LeftSidebar from "../components/LeftSidebar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";


function CaseStudy() {
  const navigate = useNavigate();


  return (
    <div id="main_content" className="font-muli theme-blush">
      <HeaderTop />
      <RightSidebar />
      <LeftSidebar />
      <div className="page">


     <div className="jumbotron bg-light p-4 rounded shadow-sm mb-4 welcome-card animate-welcome">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div style={{ width: "150px" }}></div>
              <h2 className="page-title text-primary text-center mb-0 flex-grow-1">
                Case Study
              </h2>
              <button
                onClick={() => navigate(-1)}
                className="btn btn-outline-primary mt-3 mt-md-0"
              >
                <i className="fa fa-arrow-left mr-1"></i> Back
              </button>
            </div>
            <p className="text-muted ml-5 mb-0">
              Explore detailed case studies related to the course topics.
            </p>
          </div>

        <Footer />
      </div>
    </div>
  );
}

export default CaseStudy;
