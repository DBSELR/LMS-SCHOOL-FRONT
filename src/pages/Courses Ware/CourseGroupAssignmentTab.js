// File: src/pages/Courses Ware/CourseGroupAssignmentTab.jsx

import React, { useEffect, useState } from "react";
import { Form, Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import ConfirmationPopup from "../../components/ConfirmationPopup";
import API_BASE_URL from "../../config";

const CourseGroupAssignmentTab = () => {
  const [batchList, setBatchList] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [groupList, setGroupList] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);

  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("1"); // 🔒 always "1"

  const [subjectBank, setSubjectBank] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const [showPopup, setShowPopup] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const token = localStorage.getItem("jwt");
    const res = await fetch(`${API_BASE_URL}/Programme/All`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setCourseList(data);
    setBatchList([...new Set(data.map((p) => p.batchName))]);
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (selectedBatch && selectedCourse) {
      // Groups for chosen Batch+Board
      fetch(`${API_BASE_URL}/Group/All`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          const filtered = data.filter(
            (g) => g.batchName === selectedBatch && g.programmeName === selectedCourse
          );
          setGroupList(filtered);
        });

      // Semesters (we still compute but force use of "1")
      const course = courseList.find(
        (c) => c.batchName === selectedBatch && c.programmeName === selectedCourse
      );
      const totalSems = course?.numberOfSemesters || 6;
      setSemesterOptions(Array.from({ length: totalSems }, (_, i) => i + 1));

      // 🔒 Force semester to "1"
      setSelectedSemester("1");
    }
  }, [selectedBatch, selectedCourse, courseList]);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (selectedBatch && selectedCourse && selectedGroup && selectedSemester) {
      const course = courseList.find(
        (c) => c.batchName === selectedBatch && c.programmeName === selectedCourse
      );
      const programmeId = course?.programmeId;
      if (!programmeId) return;

      // 🔒 selectedSemester is always "1"
      fetch(
        `${API_BASE_URL}/Examination/GetAssignSubjects?Batch=${selectedBatch}&ProgrammeId=${programmeId}&GroupId=${selectedGroup}&Semester=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
        .then((res) => res.json())
        .then((data) => {
          const formatted = data.map((item) => ({ ...item, examinationId: item.examinationid }));
          setSelectedSubjects(formatted.sort((a, b) => a.displayOrder - b.displayOrder));
        });

      fetch(
        `${API_BASE_URL}/Course/ByProgrammeAndSemester?batchName=${selectedBatch}&semester=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
        .then((res) => res.json())
        .then((data) => setSubjectBank(data));
    }
  }, [selectedBatch, selectedCourse, selectedGroup, selectedSemester, courseList]);

  const handleSubjectSelect = (subject) => {
    const exists = selectedSubjects.find((s) => s.examinationId === subject.examinationId);
    if (exists) {
      setSubjectToDelete(subject);
      setShowPopup(true);
    } else {
      setSelectedSubjects((prev) => [
        ...prev,
        {
          ...subject,
          examinationid: subject.examinationId,
          subjectAssignmentId: null,
          displayOrder: prev.length + 1,
        },
      ]);
    }
  };

  const confirmDelete = () => {
    setSelectedSubjects((prev) =>
      prev.filter((s) => s.examinationId !== subjectToDelete.examinationId)
    );
    setShowPopup(false);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const updated = Array.from(selectedSubjects);
    const [moved] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, moved);
    const reordered = updated.map((item, idx) => ({ ...item, displayOrder: idx + 1 }));
    setSelectedSubjects(reordered);
  };

  const resetAssignmentForm = () => {
    setSelectedBatch("");
    setSelectedCourse("");
    setSelectedGroup("");
    setSelectedSemester("1"); // keep "1"
    setGroupList([]);
    setSemesterOptions([]);
    setSubjectBank([]);
    setSelectedSubjects([]);
  };

  const handleSave = async () => {
    const toastOptions = { toastId: "assign-toast", autoClose: 3000, pauseOnHover: true };

    const course = courseList.find(
      (c) => c.batchName === selectedBatch && c.programmeName === selectedCourse
    );
    if (!course) {
      toast.error("Invalid course selection", toastOptions);
      return;
    }

    const mergedSubjects = selectedSubjects.map((subject, index) => ({
      ...subject,
      displayOrder: index + 1,
    }));

    if (mergedSubjects.length > 0) {
      const payload = {
        programmeId: course.programmeId,
        batchName: selectedBatch,
        groupId: parseInt(selectedGroup),
        semester: 1, // 🔒 always 1
        subjectIds: mergedSubjects.map((s) => s.examinationId),
      };

      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(`${API_BASE_URL}/Course/AssignSubjectsById`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("✅ Subjects assigned/Ordered successfully", toastOptions);
        resetAssignmentForm();
      } catch (err) {
        toast.error(`❌ Save failed: ${err.message}`, toastOptions);
      }
    }

    const existingSubjects = mergedSubjects.filter((s) => s.subjectAssignmentId);
    if (existingSubjects.length > 0) {
      try {
        const token = localStorage.getItem("jwt");
        await Promise.all(
          existingSubjects.map((s) =>
            fetch(`${API_BASE_URL}/Examination/UpdatePno/${s.subjectAssignmentId}/${s.displayOrder}`, {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}` },
            })
          )
        );
      } catch {
        toast.error("❌ Reorder failed", {
          toastId: "reorder-error",
          autoClose: 3000,
          pauseOnHover: true,
        });
      }
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-4 p-4 rounded">
        <h5 className="mb-3 text-primary">Assign Subjects to Board + Class</h5>
        <Form>
          <div className="row mb-3">
            <div className="col-md-4" style={{ minWidth: "200px", width: "100%" }}>
              <Form.Label>Batch</Form.Label>
              <Form.Control
                as="select"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="">Select Batch</option>
                {batchList.map((b, i) => (
                  <option key={i}>{b}</option>
                ))}
              </Form.Control>
            </div>

            <div className="col-md-4" style={{ minWidth: "200px", width: "100%" }}>
              <Form.Label>Board</Form.Label>
              <Form.Control
                as="select"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="">Select Board</option>
                {courseList
                  .filter((c) => c.batchName === selectedBatch)
                  .map((c, i) => (
                    <option key={i} value={c.programmeName}>
                      {c.programmeCode}-{c.programmeName}
                    </option>
                  ))}
              </Form.Control>
            </div>

            <div className="col-md-4" style={{ minWidth: "200px", width: "100%" }}>
              <Form.Label>Class</Form.Label>
              <Form.Control
                as="select"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                <option value="">Select Class</option>
                {groupList.map((g) => (
                  <option key={g.groupId} value={g.groupId}>
                    {g.groupCode}-{g.groupName}
                  </option>
                ))}
              </Form.Control>
            </div>

            
          </div>
        </Form>
      </div>

      <div className="row">
        <div className="col-md-6">
          <h5 className="text-dark mb-2">📚 Subject Bank</h5>
          <ul className="list-group" style={{ maxHeight: "300px", overflowY: "auto" }}>
            {subjectBank.map((s) => (
              <li key={s.examinationId} className="list-group-item d-flex align-items-center">
                <input
                  type="checkbox"
                  className="form-check-input me-2"
                  checked={selectedSubjects.some((sub) => sub.examinationId === s.examinationId)}
                  onChange={() => handleSubjectSelect(s)}
                />
                {s.paperCode} | {s.paperName}
              </li>
            ))}
          </ul>
        </div>

        <div className="col-md-6">
          <h5 className="text-dark mb-2">📦 Selected Subjects</h5>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="selectedSubjects">
              {(provided) => (
                <ul className="list-group" {...provided.droppableProps} ref={provided.innerRef}>
                  {selectedSubjects.map((s, index) => (
                    <Draggable key={s.examinationId} draggableId={String(s.examinationId)} index={index}>
                      {(provided) => (
                        <li
                          className="list-group-item d-flex justify-content-between align-items-center"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <span style={{ cursor: "grab" }}>≡</span>
                          <span style={{ textAlign: "left" }}>
                            {index + 1}. {s.paperCode} | {s.paperName}
                          </span>
                          <div>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleSubjectSelect(s)}
                            >
                              ❌
                            </button>
                          </div>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      <div className="text-center mt-4">
        <Button
          type="button"
          variant="success"
          className="rounded-pill px-5 py-2 shadow"
          style={{
            fontSize: "1.1rem",
            minWidth: "220px",
            background: "linear-gradient(90deg, rgba(29,161,242,1) 0%, rgba(0,212,255,1) 100%)",
            border: "none",
          }}
          onClick={handleSave}
        >
          💾 Save Assignments
        </Button>
      </div>

      <ConfirmationPopup
        show={showPopup}
        message={`Are you sure you want to remove "${subjectToDelete?.paperCode} - ${subjectToDelete?.paperName}"?`}
        toastMessage="Subject removed"
        onConfirm={confirmDelete}
        onCancel={() => setShowPopup(false)}
      />
    </div>
  );
};

export default CourseGroupAssignmentTab;
