import React, { useEffect, useState } from "react";
import { Form, Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { FaEdit, FaTrash } from "react-icons/fa";
import API_BASE_URL from "../../config";

const GroupsTab = ({ isActive }) => {
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [batchcourse, setBatchCourse] = useState([]);
  const [form, setForm] = useState({
    groupId: null,
    groupCode: "",
    groupName: "",
    batchName: "",
    courseValue: "",
    programmeId: "",
    programmeName: "",
    numberOfSemesters: 1,
    fee: "",
    installments:"",
    isNoGrp: false,
  });

  useEffect(() => {
    if (isActive) {
      fetchCourses();
      fetchGroups();
    }
  }, [isActive]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Programme/All`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setCourses(data);
      const uniqueBatches = [...new Set(data.map((p) => p.batchName))];
      setBatches(uniqueBatches);
    } catch {
      toast.dismiss();
      toast.error("❌ Failed to load courses");
    }
  };

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Group/All`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setGroups(data);
      console.log("Loaded Groups : ", groups)
    } catch {
      toast.dismiss();
      toast.error("❌ Failed to load groups");
    }
  };

  const fetchCoursesByBatch = async (Batch) => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Group/GetCoursesByBatch?Batch=${Batch}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setBatchCourse(data);
    } catch {
      toast.dismiss();
      toast.error("❌ Failed to fetch courses for batch");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "batchName") {
      setForm((prev) => ({ ...prev, batchName: value, courseValue: "" }));
      fetchCoursesByBatch(value);
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: name === "numberOfSemesters" ? parseInt(value) : value,
      }));
    }
  };

  const handleCourseChange = (e) => {
    const selected = e.target.value;
    const [programmeId, batchName] = selected.split("||");
    const course = courses.find(
      (c) => c.programmeId.toString() === programmeId && c.batchName === batchName
    );

    if (course) {
      const noGrp = !!course.isNoGrp;
      setForm((prev) => ({
        ...prev,
        courseValue: selected,
        programmeId: course.programmeId,
        programmeName: course.programmeName,
        batchName: course.batchName,
        numberOfSemesters: course.numberOfSemesters,
        fee: course.fee,
        installments: course.installments,
        isNoGrp: noGrp,
        groupCode: noGrp ? "00" : "",
        groupName: noGrp ? "---" : "",
      }));
    }
  };

 const handleSave = async () => {
  toast.dismiss(); // Clear existing toasts

  const {
    groupId,
    groupCode,
    groupName,
    batchName,
    programmeId,
    programmeName,
    numberOfSemesters,
    fee,
    installments,
  } = form;

  if (!groupCode || !groupName || !batchName || !programmeId || !programmeName || !fee || !installments) {
    toast.error("❌ Please fill all fields", {
      autoClose: 3000,
      toastId: "missing-fields",
    });
    return;
  }

  const payload = {
  groupCode,
  groupName,
  programmeId,
  programmeName,
  batchName,
  numberOfSemesters,
  fee: parseFloat(fee),
  installments: parseInt(installments),
  selectedSemesters: Array.from({ length: numberOfSemesters }, (_, i) => i + 1),
};


  console.log("Sent Data : " ,payload);


  const url = groupId
    ? `${API_BASE_URL}/Group/Update/${groupId}`
    : `${API_BASE_URL}/Group/Create`;
  const method = groupId ? "PUT" : "POST";

  if (groupId) payload.groupId = groupId;

  try {
    const token = localStorage.getItem("jwt");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    const resultText = await res.text();
    if (!res.ok) throw new Error(resultText || "Unknown server error");

    toast.success(`✅ Group ${groupId ? "updated" : "created"} successfully`, {
      autoClose: 3000,
      toastId: "group-save-success",
    });

    setForm({
      groupId: null,
      groupCode: "",
      groupName: "",
      batchName: "",
      courseValue: "",
      programmeId: "",
      programmeName: "",
      numberOfSemesters: 1,
      fee: "",
      installments:"",
      isNoGrp: false,
    });

    fetchGroups();
  } catch (err) {
    toast.error(`❌ ${err.message}`, {
      autoClose: 4000,
      toastId: "group-save-error",
    });
    console.error("Group Save Error:", err.message); // Optional debug
  }
};


  const handleDelete = async (groupId) => {
    toast.dismiss();
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Group/Delete/${groupId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("🗑️ Group deleted successfully");
      fetchGroups();
    } catch (err) {
      toast.error(err.message || "❌ Delete failed");
    }
  };

  const handleEdit = async (g) => {
    const isNoGrp = !!courses.find(
      (c) => c.programmeId === g.programmeId && c.batchName === g.batchName && c.isNoGrp
    );
    await fetchCoursesByBatch(g.batchName);
    setForm({
      groupId: g.groupId,
      groupCode: g.groupCode,
      groupName: g.groupName,
      batchName: g.batchName,
      courseValue: `${g.programmeId}||${g.batchName}`,
      programmeId: g.programmeId,
      programmeName: g.programmeName,
      numberOfSemesters: g.numberOfSemesters,
      fee: g.fee,
      installments:g.installments,
      isNoGrp,
    });
  };

  return (
    <div className="container py-4">
      <div className="mb-4 bg-glass p-4 border">
        <h5 className="mb-4 text-primary">Add / Edit Group</h5>
        <Form>
          <div className="row gy-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Batch Name</Form.Label>
                <Form.Control
                  as="select"
                  name="batchName"
                  value={form.batchName}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Batch</option>
                  {batches.map((b, idx) => (
                    <option key={idx} value={b}>{b}</option>
                  ))}
                </Form.Control>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Select Programme</Form.Label>
                <Form.Control
                  as="select"
                  name="courseValue"
                  value={form.courseValue}
                  onChange={handleCourseChange}
                  required
                >
                  <option value="">Select Programme</option>
                  {batchcourse.map((c) => (
                    <option key={`${c.programmeId}-${c.batchName}`} value={`${c.programmeId}||${c.batchName}`}>
                      {c.programmeCode} - {c.programmeName}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Group Code</Form.Label>
                <Form.Control
                type="number"
                  name="groupCode"
                  value={form.groupCode}
                  onChange={handleChange}
                  disabled={form.isNoGrp}
                />
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Group Name</Form.Label>
                <Form.Control
                  name="groupName"
                  value={form.groupName}
                  onChange={handleChange}
                  disabled={form.isNoGrp}
                />
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Number of Semesters</Form.Label>
                <Form.Control
                  type="number"
                  name="numberOfSemesters"
                  value={form.numberOfSemesters}
                  onChange={handleChange}
                  min={1}
                  disabled={form.isNoGrp}
                />
              </Form.Group>
            </div>

            <div className="col-md-3">
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
        <div className="col-md-3">
              <Form.Group>
                <Form.Label>Installments</Form.Label>
                <Form.Control
                  name="installments"
                  value={form.installments}
                  onChange={handleChange}
                  disabled={form.isNoGrp}
                />
              </Form.Group>
            </div>
            <div className="col-12 mt-3">
              <Button
                className="w-100 w-md-auto"
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

      <h5 className="mb-3">Groups List</h5>
      {groups.length === 0 ? (
        <p>No groups found.</p>
      ) : (
        groups.map((g) => (
          <div key={g.groupId} className="group-card mb-3">
            <strong>{g.batchName}</strong> | {g.programmeCode} - {g.programmeName} | {g.groupCode} - {g.groupName} | Sem: {g.numberOfSemesters} | Fee: ₹{g.fee}
            <div className="d-flex justify-content-end gap-2 mt-2">
              <button className="btn btn-sm btn-outline-info" onClick={() => handleEdit(g)}>
                <FaEdit /> Edit
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(g.groupId)}>
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default GroupsTab;
