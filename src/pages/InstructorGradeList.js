import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderTop from "../components/HeaderTop";
import RightSidebar from "../components/RightSidebar";
import LeftSidebar from "../components/LeftSidebar";
import Footer from "../components/Footer";
import API_BASE_URL from "../config";

function InstructorGradeList() {
  const [submissions, setSubmissions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    fetch(`${API_BASE_URL}/InstructorExam/SubmissionsToGrade`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => setSubmissions(data))
      .catch(err => console.error("Failed to fetch submissions", err));
  }, []);

  return (
    <div id="main_content" className="font-muli theme-blush">
      <HeaderTop />
      <RightSidebar />
      <LeftSidebar role="Instructor" />

      <div className="page">
        <div className="section-body mt-3">
          <div className="container-fluid">
            <div className="welcome-card animate-welcome mb-4">
              <div>
                <h2 className="text-primary mb-2">Grade Exams</h2>
                <p className="text-muted mb-0">Review and grade pending exam submissions.</p>
              </div>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center text-muted py-5">
                <h5>No ungraded submissions found.</h5>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="thead-light">
                    <tr>
                      <th>Student</th>
                      <th>Exam</th>
                      <th>Submitted At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s) => (
                      <tr key={s.submissionId}>
                        <td>{s.studentName}</td>
                        <td>{s.examTitle}</td>
                        <td>{new Date(s.submittedAt).toLocaleString()}</td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/instructor/grade/${s.submissionId}`)}
                          >
                            Grade
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

export default InstructorGradeList;
