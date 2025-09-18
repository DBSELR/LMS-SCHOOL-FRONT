import React, { useState } from "react";
import HeaderTop from "../components/HeaderTop";
import RightSidebar from "../components/RightSidebar";
import LeftSidebar from "../components/LeftSidebar";
import Footer from "../components/Footer";

import { FaChalkboardTeacher } from "react-icons/fa";
import CoursesTab from "./Courses Ware/CoursesTab";
import GroupsTab from "./Courses Ware/GroupsTab";
import SubjectsBankTab from "./Courses Ware/SubjectsBankTab";
import CourseGroupAssignmentTab from "./Courses Ware/CourseGroupAssignmentTab";
import SubjectsListTab from "./Courses Ware/SubjectsListTab";
import BatchTab from "./Courses Ware/BatchTab";



function AdminDashboardTabs() {
  const [activeTab, setActiveTab] = useState("batch");


const tabs = [
  { key: "batch", label: "Batch", component: <BatchTab isActive={activeTab === "batch"} /> },
  { key: "courses", label: "Board", component: <CoursesTab isActive={activeTab === "courses"} /> },
  { key: "groups", label: "Classes", component: <GroupsTab isActive={activeTab === "groups"} /> },
  { key: "subjects", label: "Subjects Bank", component: <SubjectsBankTab isActive={activeTab === "subjects"} /> },
  { key: "assignment", label: "Board & Class Assignment", component: <CourseGroupAssignmentTab isActive={activeTab === "assignment"} /> },
  // { key: "subjectsList", label: "Subjects Overview", component: <SubjectsListTab isActive={activeTab === "subjectsList"} /> },
];



  return (
    <div id="main_content" className="font-muli theme-blush">
      <HeaderTop />
      <RightSidebar />
      <LeftSidebar role="Admin" />


      <div className="page">
        <div className="section-body mt-3">
          <div className="container-fluid ">
            <div className="jumbotron bg-light p-4 rounded shadow-sm mb-4 welcome-card animate-welcome">
              <h2 className="page-title text-primary">
                <i class="fa-solid fa-book"></i> Subject Master – Courseware Module
              </h2>
              <p className="text-muted mb-0">
                Manage Boards, Classes, Subjects, and Assignments with streamlined workflow.
              </p>
            </div>
          </div>
        </div>


        <div className="section-body mt-2">
          <div className="container-fluid">
            <div className="card welcome-card animate-welcome">
              <div className="card-header bg-primary text-white d-flex align-items-center ">
                <FaChalkboardTeacher className="mr-2" />
                <h6 className="mb-0">LMS Board Configuration</h6>
              </div>


              <div  >
                <ul
                  className="nav nav-tabs page-header-tab animate-welcome"
                  role="tablist"
                  style={{ borderBottom: "2px solid #5a67d8",padding:'0px'}}
                >
                  {tabs.map((tab) => (
                    <li className="nav-item" key={tab.key}>
                      <a
                        className={`nav-link ${
                          activeTab === tab.key ? "active font-weight-bold text-primary" : ""
                        }`}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                          cursor: "pointer",
                          fontSize: "15px",
                          padding: "5px 6px",
                          border: "none",
                          borderBottom:
                            activeTab === tab.key ? "3px solid #5a67d8" : "none",
                          transition: "all 0.3s ease"
                        }}
                      >
                        {tab.label}
                      </a>
                    </li>
                  ))}
                </ul>


                <div className="tab-content mt-4">
                  {tabs.map((tab) => (
                    <div
                      key={tab.key}
                      className={`tab-pane fade ${activeTab === tab.key ? "show active" : ""}`}
                    >
                      {tab.component}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>


        <Footer />
      </div>
    </div>
  );
}


export default AdminDashboardTabs;


