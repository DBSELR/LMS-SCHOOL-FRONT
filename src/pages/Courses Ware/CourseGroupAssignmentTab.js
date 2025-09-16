// File: src/pages/Courses Ware/CourseGroupAssignmentTab.jsx

import React, { useEffect, useState } from "react";
import { Form, Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import ConfirmationPopup from "../../components/ConfirmationPopup";
//import "react-toastify/dist/ReactToastify.css";
import API_BASE_URL from "../../config";

const CourseGroupAssignmentTab = () => {
  const [batchList, setBatchList] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [groupList, setGroupList] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);

  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    setCourseList(data);
    setBatchList([...new Set(data.map((p) => p.batchName))]);
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (selectedBatch && selectedCourse) {
      fetch(`${API_BASE_URL}/Group/All`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          const filtered = data.filter(
            (g) =>
              g.batchName === selectedBatch &&
              g.programmeName === selectedCourse
          );
          setGroupList(filtered);
        });

      const course = courseList.find(
        (c) =>
          c.batchName === selectedBatch && c.programmeName === selectedCourse
      );
      const totalSems = course?.numberOfSemesters || 6;
      setSemesterOptions(Array.from({ length: totalSems }, (_, i) => i + 1));
    }
  }, [selectedBatch, selectedCourse]);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (selectedBatch && selectedCourse && selectedGroup && selectedSemester) {
      const course = courseList.find(
        (c) =>
          c.batchName === selectedBatch && c.programmeName === selectedCourse
      );
      const programmeId = course?.programmeId;
      if (!programmeId) return;

      fetch(
        `${API_BASE_URL}/Examination/GetAssignSubjects?Batch=${selectedBatch}&ProgrammeId=${programmeId}&GroupId=${selectedGroup}&Semester=${selectedSemester}`
      , {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          const formatted = data.map((item) => ({
            ...item,
            examinationId: item.examinationid,
          }));
          setSelectedSubjects(
            formatted.sort((a, b) => a.displayOrder - b.displayOrder)
          );
        });

      fetch(
        `${API_BASE_URL}/Course/ByProgrammeAndSemester?batchName=${selectedBatch}&semester=${selectedSemester}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
        .then((res) => res.json())
        .then((data) => setSubjectBank(data));
    }
  }, [selectedBatch, selectedCourse, selectedGroup, selectedSemester]);

  const handleSubjectSelect = (subject) => {
    const exists = selectedSubjects.find(
      (s) => s.examinationId === subject.examinationId
    );
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

  const moveSubject = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= selectedSubjects.length) return;

    const updated = [...selectedSubjects];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    const reordered = updated.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1,
    }));
    setSelectedSubjects(reordered);

    const toUpdate = reordered.filter((item) => item.subjectAssignmentId);
    try {
      const token = localStorage.getItem("jwt");
      await Promise.all(
        toUpdate.map((item) =>
          fetch(
            `${API_BASE_URL}/Examination/UpdatePno/${item.subjectAssignmentId}/${item.displayOrder}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );
      // toast.success("Display order updated!");
      toast.success("✅ Saved successfully", {
  toastId: "save-success"
});
    } catch (error) {
      // toast.error("Update failed");
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const updated = Array.from(selectedSubjects);
    const [moved] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, moved);

    const reordered = updated.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1,
    }));
    setSelectedSubjects(reordered);
  };

  const resetAssignmentForm = () => {
    setSelectedBatch("");
    setSelectedCourse("");
    setSelectedGroup("");
    setSelectedSemester("");
    setGroupList([]);
    setSemesterOptions([]);
    setSubjectBank([]);
    setSelectedSubjects([]);
  };

const handleSave = async () => {
  const toastOptions = {
    toastId: "assign-toast",
    autoClose: 3000,
    pauseOnHover: true,
  };

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

  const newSubjects = mergedSubjects.filter((s) => !s.subjectAssignmentId);
  const existingSubjects = mergedSubjects.filter((s) => s.subjectAssignmentId);

  if (mergedSubjects.length > 0) {
    const payload = {
      programmeId: course.programmeId,
      batchName: selectedBatch,
      groupId: parseInt(selectedGroup),
      semester: parseInt(selectedSemester),
      subjectIds: mergedSubjects.map((s) => s.examinationId),
    };

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `${API_BASE_URL}/Course/AssignSubjectsById`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(await res.text());

      toast.success("✅ Subjects assigned/Ordered successfully", toastOptions);
      resetAssignmentForm();
    } catch (err) {
      toast.error(`❌ Save failed: ${err.message}`, toastOptions);
    }
  }

  if (existingSubjects.length > 0) {
    try {
      const token = localStorage.getItem("jwt");
      await Promise.all(
        existingSubjects.map((s) =>
          fetch(
            `${API_BASE_URL}/Examination/UpdatePno/${s.subjectAssignmentId}/${s.displayOrder}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );
      // toast.success("✅ Reorder saved", {
      //   toastId: "reorder-toast",
      //   autoClose: 3000,
      //   pauseOnHover: true,
      // });
    } catch (err) {
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
      {/* <ToastContainer position="bottom-center" autoClose={3000} /> */}
      <div className="mb-4 p-4 rounded">
        <h5 className="mb-3 text-primary">
          Assign Subjects to Programme + Group + Semesters
        </h5>
        <Form >
          <div className="row mb-3">
            <div className="col-md-3" style={{ minWidth: "200px",
  width: "100%" }}>
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
            <div className="col-md-3" style={{ minWidth: "200px",
  width: "100%" }}>
              <Form.Label>Programme</Form.Label>
              <Form.Control
                as="select"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="">Select Programme</option>
                {courseList
                  .filter((c) => c.batchName === selectedBatch)
                  .map((c, i) => (
                    <option key={i} value={c.programmeName}>
                      {c.programmeCode}-{c.programmeName}
                    </option>
                  ))}
              </Form.Control>
            </div>
            <div className="col-md-3" style={{ minWidth: "200px",
  width: "100%" }}>
              <Form.Label>Group</Form.Label>
              <Form.Control
                as="select"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                <option value="">Select Group</option>
                {groupList.map((g) => (
                  <option key={g.groupId} value={g.groupId}>
                    {g.groupCode}-{g.groupName}
                  </option>
                ))}
              </Form.Control>
            </div>
            <div className="col-md-3" style={{ minWidth: "200px",
  width: "100%" }}>
              <Form.Label>Semester</Form.Label>
              <Form.Control
                as="select"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
              >
                <option value="">Select Semester</option>
                {semesterOptions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Form.Control>
            </div>
          </div>
        </Form>
      </div>

      <div className="row">
   <div className="col-md-6">
  <h5 className="text-dark mb-2">📚 Subject Bank</h5>
  <ul
    className="list-group"
    style={{
      maxHeight: '300px', // adjust as needed
      overflowY: 'auto',
    }}
  >
    {subjectBank.map((s) => (
      <li
        key={s.examinationId}
        className="list-group-item d-flex align-items-center"
      >
        <input
          type="checkbox"
          className="form-check-input me-2"
          checked={selectedSubjects.some(
            (sub) => sub.examinationId === s.examinationId
          )}
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
                <ul
                  className="list-group"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {selectedSubjects.map((s, index) => (
                    <Draggable
                      key={s.examinationId}
                      draggableId={String(s.examinationId)}
                      index={index}
                    >
                      {(provided) => (
                        <li
                          className="list-group-item d-flex justify-content-between align-items-center"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <span
                            {...provided.dragHandleProps}
                            style={{
                              cursor: "grab",
                              // paddingRight: "10px",
                              // fontSize: "1.2rem",
                            }}
                          >
                            ≡
                          </span>
                          <span style={{ textAlign:'left' }}>
                            {index + 1}. {s.paperCode} | {s.paperName}
                          </span>
                          <div>
                            {/* <button
                              className="btn btn-sm btn-outline-secondary me-1"
                              onClick={() => moveSubject(index, -1)}
                              disabled={index === 0}
                            >
                              ⬆️
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary me-1"
                              onClick={() => moveSubject(index, 1)}
                              disabled={index === selectedSubjects.length - 1}
                            >
                              ⬇️
                            </button> */}
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
        {/* <Button
          variant="success"
          className="rounded-pill px-5 py-2 shadow"
          style={{
            fontSize: "1.1rem",
            minWidth: "220px",
            background:
              "linear-gradient(90deg, rgba(29,161,242,1) 0%, rgba(0,212,255,1) 100%)",
            border: "none",
          }}
          onClick={handleSave}
        >
          💾 Save Assignments
        </Button> */}

        <Button
          type="button" // ✅ Prevents form submit triggering again
          variant="success"
          className="rounded-pill px-5 py-2 shadow"
          style={{
            fontSize: "1.1rem",
            minWidth: "220px",
            background:
              "linear-gradient(90deg, rgba(29,161,242,1) 0%, rgba(0,212,255,1) 100%)",
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
