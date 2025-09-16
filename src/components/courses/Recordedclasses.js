
// ✅ Full & Final - InstructorTickets.js
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HeaderTop from "../HeaderTop";
import RightSidebar from "../RightSidebar";
import LeftSidebar from "../LeftSidebar";
import Footer from "../Footer";
import API_BASE_URL from "../../config";

const Recordedclasses = () => {


  return (
    <div id="main_content" className="font-muli theme-blush">
      <HeaderTop />
      <RightSidebar />
      <LeftSidebar  />
      <div className="page mt-4">

        <div className="jumbotron bg-light p-4 rounded shadow-sm mb-4 welcome-card animate-welcome">
          <h2 className="page-title text-primary">
            <i className="fa-solid fa-headset"></i> Recorded Classes
          </h2>
          {/* <p className="text-muted mb-0">View and manage all support tickets</p> */}
        </div>
        
        <Footer />
      </div>

    </div>
  );
};

export default Recordedclasses;
