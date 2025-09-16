import React, { useState } from "react";
import HeaderTop from "../components/HeaderTop";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import Footer from "../components/Footer";
import ProfileCard from "../components/profile/ProfileCard";
import EducationTab from "../components/profile/EducationTab";
import ExperienceTab from "../components/profile/ExperienceTab";
import ConferencesTab from "../components/profile/ConferencesTab";
import SkillsTab from "../components/profile/SkillsTab";
import AchievementsTab from "../components/profile/AchievementsTab";
import API_BASE_URL from "../config";

function ProfilePage() {
  const [activeTab, setActiveTab] = useState("education");

  return (
    <div id="main_content" className="font-muli theme-blush">
      <div className="page-loader-wrapper">
        <div className="loader"></div>
      </div>

      <HeaderTop />
      <RightSidebar />
      <LeftSidebar />

      <div className="page">
        {/* Header Section */}
        <div className="section-body mt-3">
          <div className="container-fluid">
            <div className="jumbotron bg-light p-4 rounded shadow-sm d-flex justify-content-between align-items-center flex-wrap">
              <div>
                <h2 className="text-primary mb-2">👤 Profile Overview</h2>
                <p className="text-muted mb-0">Manage your education, experience, skills and achievements.</p>
              </div>
              <ol className="breadcrumb bg-transparent p-0 m-0 mt-3 mt-md-0">
                <li className="breadcrumb-item">
                  <a href="/" className="text-secondary">Dashboard</a>
                </li>
                <li className="breadcrumb-item active text-dark" aria-current="page">
                  Profile
                </li>
              </ol>
            </div>

            {/* Profile Content */}
            <div className="row clearfix">
              
              {/* Profile Card */}
              <div className="col-lg-4 col-md-12">
                <ProfileCard />
              </div>

              {/* Tabs and Details */}
              <div className="col-lg-8 col-md-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-gradient-primary text-white d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">Professional Details</h6>
                    <ul className="nav nav-tabs card-header-tabs flex-wrap">
                      {[
                        { label: "Education", value: "education" },
                        { label: "Experience", value: "experience" },
                        { label: "Conferences", value: "conferences" },
                        { label: "Skills", value: "skills" },
                        { label: "Achievements", value: "achievements" }
                      ].map((tab) => (
                        <li className="nav-item" key={tab.value}>
                          <a
                            className={`nav-link ${activeTab === tab.value ? "active" : ""}`}
                            href={`#${tab.value}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveTab(tab.value);
                            }}
                          >
                            {tab.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="card-body p-4 bg-light rounded-bottom">
                    {activeTab === "education" && <EducationTab />}
                    {activeTab === "experience" && <ExperienceTab />}
                    {activeTab === "conferences" && <ConferencesTab />}
                    {activeTab === "skills" && <SkillsTab />}
                    {activeTab === "achievements" && <AchievementsTab />}
                  </div>
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

export default ProfilePage;
