import React, { useEffect, useState } from "react";
import { Form, Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { FaEdit, FaTrash } from "react-icons/fa";
import API_BASE_URL from "../../config";

const CLASS_CODE_OPTIONS = [
  { display: "VI", value: "06" },
  { display: "VII", value: "07" },
  { display: "VIII", value: "08" },
  { display: "IX", value: "09" },
  { display: "X", value: "10" },
];

const GroupsTab = ({ isActive }) => {
  const [groups, setGroups] = useState([]);
  const [batchcourse, setBatchCourse] = useState([]);

  const [form, setForm] = useState({
    groupId: null,
    groupCode: "",
    groupName: "",
    batchName: "",
    courseValue: "",
    // hidden/derived
    programmeId: "",
    programmeName: "",
    numberOfSemesters: 1,
    fee: "",
    installments: "",
    isNoGrp: false,
  });

  useEffect(() => {
    if (isActive) {
      fetchCoursesByBatch();
      fetchGroups();
    }
  }, [isActive]);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Group/All`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      toast.dismiss();
      toast.error("❌ Failed to load groups");
    }
  };

  const fetchCoursesByBatch = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Group/GetCoursesByBatch`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBatchCourse(Array.isArray(data) ? data : []);
    } catch {
      toast.dismiss();
      toast.error("❌ Failed to fetch courses for batch");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "fee") {
      setForm((prev) => ({ ...prev, fee: value }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Class Code dropdown -> derive a readable name unless No-Group
  const handleGroupCodeChange = (e) => {
    const code = e.target.value;
    const display = CLASS_CODE_OPTIONS.find((opt) => opt.value === code)?.display;
    setForm((prev) => ({
      ...prev,
      groupCode: code,
      groupName: prev.isNoGrp ? prev.groupName : code ? `Class - ${display}` : "",
    }));
  };

  // When board changes, derive hidden values from selected course
  const handleCourseChange = (e) => {
    const selected = e.target.value;

    if (selected) {
      const [programmeId, batchName] = selected.split("||");
      const course = batchcourse.find(
        (c) => String(c.programmeId) === String(programmeId) && c.batchName === batchName
      );

      if (course) {
        const noGrp = !!course.isNoGrp;
        setForm((prev) => ({
          ...prev,
          courseValue: selected,
          programmeId: course.programmeId,
          programmeName: course.programmeName,
          batchName: course.batchName,
          numberOfSemesters: course.numberOfSemesters ?? 1,
          fee: course.fee ?? "",
          installments: course.installments ?? "",
          isNoGrp: noGrp,
          groupCode: noGrp ? "00" : prev.groupCode,
          groupName: noGrp ? "---" : prev.groupName,
        }));
      }
    } else {
      setForm((prev) => ({
        ...prev,
        courseValue: "",
        programmeId: "",
        programmeName: "",
        batchName: "",
        numberOfSemesters: 1,
        fee: "",
        installments: "",
        isNoGrp: false,
        groupCode: "",
        groupName: "",
      }));
    }
  };

  const handleSave = async () => {
    toast.dismiss();

    const {
      groupId,
      groupCode,
      programmeId,
      programmeName,
      numberOfSemesters,
      fee,
      installments,
      isNoGrp,
      batchName,
    } = form;

    if (!programmeId) {
      toast.error("❌ Please select Board", { autoClose: 3000 });
      return;
    }

    if (!isNoGrp) {
      if (!groupCode) {
        toast.error("❌ Please select Class Code", { autoClose: 3000 });
        return;
      }

      // ✅ Duplicate check scoped to same programme (and batch if you want)
      const isDuplicate = groups.some(
        (g) =>
          g.groupCode === groupCode &&
          String(g.programmeId) === String(programmeId) &&
          // If you also want per-batch uniqueness, uncomment the next line:
          // g.batchName === batchName &&
          g.groupId !== groupId
      );
      if (isDuplicate) {
        toast.error("❌ Duplicate Group Code not allowed for this Board", { autoClose: 3000 });
        return;
      }
    }

    if (!numberOfSemesters || !fee || !installments) {
      toast.error(
        "❌ Board must provide Semesters, Fee & Installments. Re-select the Board.",
        { autoClose: 3500 }
      );
      return;
    }

    const payload = {
      groupCode: isNoGrp ? "00" : groupCode,
      groupName: isNoGrp ? "---" : groupCode, // keep numeric as stored name per your current approach
      programmeId,
      programmeName,
      numberOfSemesters: Number(numberOfSemesters),
      fee: parseFloat(fee),
      installments: parseInt(installments, 10),
      selectedSemesters: Array.from({ length: Number(numberOfSemesters) }, (_, i) => i + 1),
    };
    if (groupId) payload.groupId = groupId;

    const url = groupId
      ? `${API_BASE_URL}/Group/Update/${groupId}`
      : `${API_BASE_URL}/Group/Create`;
    const method = groupId ? "PUT" : "POST";

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const resultText = await res.text();
      if (!res.ok) throw new Error(resultText || "Unknown server error");

      toast.success(`✅ Class ${groupId ? "updated" : "created"} successfully`, {
        autoClose: 3000,
      });

      setForm({
        groupId: null,
        groupCode: "",
        groupName: "",
        courseValue: "",
        programmeId: "",
        programmeName: "",
        batchName: "",
        numberOfSemesters: 1,
        fee: "",
        installments: "",
        isNoGrp: false,
      });

      fetchGroups();
    } catch (err) {
      toast.error(`❌ ${err.message}`, { autoClose: 4000 });
      console.error("Group Save Error:", err.message);
    }
  };

  const handleDelete = async (groupId) => {
    toast.dismiss();
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Group/Delete/${groupId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("🗑️ Group deleted successfully");
      fetchGroups();
    } catch (err) {
      toast.error(err.message || "❌ Delete failed");
    }
  };

  const handleEdit = async (g) => {
    // make sure courses list for dropdown is fresh
    await fetchCoursesByBatch();

    // Detect "No-Group" using batchcourse (not the removed 'courses' state)
    const matchedCourse = batchcourse.find(
      (c) => c.programmeId === g.programmeId && c.batchName === g.batchName
    );
    const isNoGrp = !!matchedCourse?.isNoGrp;

    // Normalize the display name if you want a friendly one
    const normalizedName = isNoGrp ? "---" : g.groupName || g.groupCode || "";

    setForm({
      groupId: g.groupId,
      groupCode: isNoGrp ? "00" : g.groupCode,
      groupName: normalizedName,
      batchName: g.batchName,
      courseValue: `${g.programmeId}||${g.batchName}`,
      programmeId: g.programmeId,
      programmeName: g.programmeName,
      numberOfSemesters: g.numberOfSemesters,
      fee: g.fee,
      installments: g.installments,
      isNoGrp,
    });
  };

  return (
    <div className="container py-0 pt-0 welcome-card animate-welcome">
      <div className="mb-0 bg-glass p-0 border">
        <h5 className="mb-0 mt-0 text-primary">Add / Edit Class</h5>
        <Form>
          <div className="row g-3">
            {/* Select Board */}
            <div className="col-12 col-lg-6">
              <Form.Group>
                <Form.Label>Select Board</Form.Label>
                <Form.Control
                  as="select"
                  name="courseValue"
                  value={form.courseValue}
                  onChange={handleCourseChange}
                  required
                >
                  <option value="">Select Board</option>
                  {batchcourse.map((c) => (
                    <option
                      key={`${c.programmeId}-${c.batchName}`}
                      value={`${c.programmeId}||${c.batchName}`}
                    >
                      {c.programmeCode} - {c.programmeName}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </div>

            {/* Class (dropdown) */}
            <div className="col-12 col-lg-6">
              <Form.Group>
                <Form.Label>Class</Form.Label>
                <Form.Control
                  as="select"
                  name="groupCode"
                  value={form.groupCode}
                  onChange={handleGroupCodeChange}
                  disabled={form.isNoGrp}
                >
                  <option value="">Select Class</option>
                  {CLASS_CODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.display}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </div>

            {/* Total Fee */}
            <div className="col-12 col-lg-6">
              <Form.Group>
                <Form.Label>Total Fee</Form.Label>
                <Form.Control
                  name="fee"
                  value={form.fee}
                  onChange={handleChange}
                  disabled={form.isNoGrp}
                />
              </Form.Group>
            </div>

            {/* Save Button - Full width on small, auto width on large */}
            <div className="col-4 mt-4 d-flex gap-2 align-items-center">
              <Button
                className="rounded-pill px-4 class-save-btn"
                variant="success"
                onClick={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                {form.groupId ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </Form>
      </div>

      <h5 className="mb-3">Classes List</h5>
      <div className="semester-panel-body">
        {groups.length === 0 ? (
          <p>No classes found.</p>
        ) : (
          groups.map((g) => (
            <div key={g.groupId} className="group-card mb-3">
              <strong>{g.batchName}</strong> | {g.programmeCode} - {g.programmeName} |{" "}
              Class - {g.groupName} | Fee: ₹{g.fee}
              <div className="d-flex justify-content-end gap-2 mt-2">
                <button className="btn btn-sm btn-outline-info" onClick={() => handleEdit(g)}>
                  <i className="fa-solid fa-pen-to-square" ></i>
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleDelete(g.groupId)}
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GroupsTab;
