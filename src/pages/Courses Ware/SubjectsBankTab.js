import React, { useEffect, useState, useRef } from "react";
import { Form, Button, Table, Row, Col, Modal } from "react-bootstrap";
import Select from "react-select";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";

const SubjectsBankTab = ({ isActive }) => {
  const [cgData, setCgData] = useState([]);
  const [filteredCGOptions, setFilteredCGOptions] = useState([]);
  const [selectedCG, setSelectedCG] = useState([]);
  const [batches, setBatches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [SubBank, setSubBank] = useState([]);
  const formRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const filteredSubjects = SubBank.filter(
    (item) =>
      item.paperName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.paperCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [activeExaminationId, setActiveExaminationId] = useState(null);
  const [isUnitEditMode, setIsUnitEditMode] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [units, setUnits] = useState([{ unitNo: 1, title: "", duration: "0 0" }]);

  // Only the fields we show + hidden semester
  const [form, setForm] = useState({
    batchName: "",
    semester: "", // hidden: auto set to first available sem for selected batch
    paperCode: "",
    paperName: "",
    // hidden/dummy fields (always sent as fixed values)
    examinationId: null,
  });

  useEffect(() => {
    if (isActive) {
      fetchInitialData();
      setSubBank([]);
      fetchSubBank();
    }
  }, [isActive]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch(`${API_BASE_URL}/Examination/GetBatch`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const uniqueBatches = Array.isArray(data)
        ? [...new Set(data.map((item) => item.batchName))]
        : [];
      setBatches(uniqueBatches);
    } catch (err) {
      toast.error("Failed to load batches");
      console.error("❌ Error fetching batches", err);
    }
  };

  const fetchSemesters = async (batch) => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `${API_BASE_URL}/Examination/GetSubjectbankSems?batch=${encodeURIComponent(batch)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const semList = data.map((item) => item.sem);
      setSemesters(semList);
      // Hidden behavior: auto-pick the first semester
      setForm((prev) => ({ ...prev, semester: semList?.[0]?.toString() || "" }));
      setSelectedCG([]);
      setCgData([]);
    } catch (err) {
      toast.error("Failed to fetch semesters");
      console.error("❌ Error fetching semesters", err);
    }
  };

  const fetchSubBank = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Examination/GetSubBank`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubBank(data);
    } catch (err) {
      toast.error("Failed to fetch subjects");
      console.error("❌ Error fetching SubBank", err);
    }
  };

  const fetchCGData = async (batch, sem) => {
    if (!batch || !sem) return;
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `${API_BASE_URL}/COURSE/GetProgrammeandgroups?Batch=${encodeURIComponent(
          batch
        )}&SEM=${encodeURIComponent(sem)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setCgData(data);
    } catch (err) {
      toast.error("Failed to fetch Course/Group");
      console.error("❌ Error fetching CG data", err);
    }
  };

  // When batch and hidden semester are set, load CG options
  useEffect(() => {
    if (form.batchName && form.semester) {
      fetchCGData(form.batchName, form.semester);
    }
  }, [form.batchName, form.semester]);

  // Build react-select options from cgData
  useEffect(() => {
    if (Array.isArray(cgData) && cgData.length) {
      const filtered = cgData.map((cg) => ({
        value: cg.cGId,
        label: cg.cGName,
        courseId: cg.cGId?.split("_")[0],
        groupId: cg.cGId?.split("_")[1],
        batchName: cg.batchName,
      }));
      setFilteredCGOptions(filtered);
    } else {
      setFilteredCGOptions([]);
    }
  }, [cgData]);

  const handleChange = async (e) => {
    const { name, value } = e.target;

    // Only visible fields handled here
    if (name === "batchName") {
      setForm((prev) => ({ ...prev, batchName: value, paperCode: prev.paperCode, paperName: prev.paperName }));
      if (value) {
        await fetchSemesters(value); // sets hidden semester to first available
      } else {
        setForm((prev) => ({ ...prev, semester: "" }));
        setSelectedCG([]);
        setCgData([]);
      }
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = async (exam) => {
    await fetchSemesters(exam.batchName); // will also set a first-sem; override with exam.semester below
    setForm({
      batchName: exam.batchName,
      semester: exam.semester?.toString() || "",
      paperCode: exam.paperCode,
      paperName: exam.paperName,
      examinationId: exam.examinationId ?? null,
    });
    setSelectedCG([
      {
        value: `${exam.programmeId}_${exam.groupId}`,
        label: `${exam.programmeCode} - ${exam.programmeName} / ${exam.groupCode} - ${exam.groupName}`,
        groupId: exam.groupId,
      },
    ]);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetForm = () => {
    setForm({
      batchName: "",
      semester: "",
      paperCode: "",
      paperName: "",
      examinationId: null,
    });
    setSelectedCG([]);
    setSemesters([]);
    setCgData([]);
    setFilteredCGOptions([]);
  };

  const handleSubmit = async () => {
    const { examinationId, batchName, semester, paperCode, paperName } = form;

    if (!batchName || !semester || !paperCode || !paperName) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!selectedCG.length) {
      toast.error("Please choose Board / Class");
      return;
    }

    const method = examinationId ? "PUT" : "POST";
    const endpoint = examinationId
      ? `${API_BASE_URL}/Examination/Update/${examinationId}`
      : `${API_BASE_URL}/Examination/Create`;

    let hasError = false;

    // Send one payload per selected Programme/Group, using fixed dummy values for hidden fields
    for (const cg of selectedCG) {
      const payload = {
        batchName,
        semester: parseInt(semester, 10),
        paperCode,
        paperName,

        // fixed/dummy values (hidden from UI)
        isElective: false,
        paperType: "Theory",
        credits: 0,
        internalMax1: 0,
        internalPass1: 0,
        internalMax2: 0,
        internalPass2: 0,
        InternalMax: 0,
        InternalPass: 0,
        theoryMax: 0,
        theoryPass: 0,
        totalMax: 0,
        totalPass: 0,
      };

      if (examinationId) payload.examinationId = Number(examinationId);

      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorText = await res.text();
          toast.error(`❌ ${cg.label} failed: ${errorText}`);
          hasError = true;
        }
      } catch (err) {
        toast.error(`❌ ${cg.label} error: ${err.message}`);
        hasError = true;
      }
    }

    if (!hasError) {
      toast.success("✅ Subject saved successfully");
      resetForm();
      fetchInitialData();
      fetchSubBank();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subject?")) return;
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Examination/Delete/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Subject deleted successfully");
      fetchInitialData();
      fetchSubBank();
    } catch (err) {
      toast.error(err.message || "Delete failed");
    }
  };

  const fetchUnitsByExamId = async (exam) => {
    try {
      const token = localStorage.getItem("jwt");
      // Set subject summary for modal header
      setForm((prev) => ({
        ...prev,
        batchName: exam.batchName,
        semester: exam.semester?.toString() || "",
        paperCode: exam.paperCode,
        paperName: exam.paperName,
      }));

      const res = await fetch(
        `${API_BASE_URL}/Examination/GetSubjectUnitsById/${exam.examinationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();

      const formattedUnits = data.map((u) => ({
        unitId: u.unitId,
        unitNo: u.unitNumber,
        title: u.title,
        duration: `${u.hours} ${u.minutes}`,
      }));

      setUnits(formattedUnits);
      setActiveExaminationId(exam.examinationId);
      setShowUnitModal(true);
    } catch (err) {
      toast.error("Failed to fetch units");
    }
  };

  return (
    <div className="container py-4">
      <div className="row">
        {/* Add / Edit Subject (only the requested fields) */}
        <div className="col-12 col-lg-6 mb-4">
          <div className="p-0 rounded bg-glass border shadow-sm" style={{ height: "500px", display: "flex" }}>
            <div
              ref={formRef}
              className="p-4 overflow-auto custom-scrollbar"
              style={{ flex: 1, scrollMarginRight: "20px" }}
            >
              <h5 className="mb-4 text-primary">Add / Edit Subject</h5>
              <Form>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label>Batch</Form.Label>
                    <Form.Control
                      as="select"
                      name="batchName"
                      value={form.batchName}
                      onChange={handleChange}
                    >
                      <option value="">Select Batch</option>
                      {batches.map((b, i) => (
                        <option key={i}>{b}</option>
                      ))}
                    </Form.Control>
                  </Col>

                  {/* Semester is hidden (auto-chosen as first available for the batch) */}

                  <Col md={6}>
                    <Form.Label>Board / Class </Form.Label>
                    <Select
                      isMulti
                      name="courseGroup"
                      options={filteredCGOptions}
                      value={selectedCG}
                      onChange={setSelectedCG}
                      isDisabled={!form.batchName || !form.semester}
                      placeholder={
                        !form.batchName
                          ? "Select batch first"
                          : !form.semester
                          ? "Loading classes…"
                          : "Select Board / Class"
                      }
                    />
                  </Col>
                </Row>

                <hr className="my-4" />

                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Paper Code</Form.Label>
                      <Form.Control
                        name="paperCode"
                        value={form.paperCode}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={8}>
                    <Form.Group>
                      <Form.Label>Paper Name</Form.Label>
                      <Form.Control
                        name="paperName"
                        value={form.paperName}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Hidden: Paper Type, Credits, Is Elective, and entire Marks section (all sent as fixed values) */}

                <div className="text-center mt-4">
                  <Button
                    variant="success"
                    className="rounded-pill px-4"
                    onClick={handleSubmit}
                  >
                    {form.examinationId ? "Update" : "Save"}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>

        {/* 📋 Saved Subjects (unchanged) */}
        <div className="col-12 col-lg-6 mb-4">
          <div
            className="p-0 rounded bg-white border shadow-sm"
            style={{ height: "500px", display: "flex" }}
          >
            <div
              className="p-4 overflow-auto custom-scrollbar"
              style={{ flex: 1, scrollMarginRight: "20px" }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">📋 Saved Subjects</h5>
                <input
                  type="text"
                  className="form-control ms-3"
                  placeholder="Search by Name or Code"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ maxWidth: "170px" }}
                />
              </div>

              <Table bordered striped hover size="sm">
                <thead>
                  <tr>
                    <th>Batch</th>
                    {/* <th>Sem</th> */}
                    <th>Paper Code</th>
                    <th>Paper Name</th>
                    <th>Units</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.map((exam) => (
                    <tr key={exam.examinationId}>
                      <td>{exam.batchName}</td>
                      {/* <td>{exam.semester}</td> */}
                      <td>{exam.paperCode}</td>
                      <td className="text-left">{exam.paperName}</td>
                      <td className="text-left">
                        <Button
                          size="sm"
                          variant="link"
                          onClick={() => fetchUnitsByExamId(exam)}
                        >
                          ➕ {exam.unitCount != null ? ` (${exam.unitCount})` : ""}
                        </Button>
                      </td>
                      <td>
                        <Button size="sm" variant="link" onClick={() => handleEdit(exam)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="link"
                          className="text-danger"
                          onClick={() => handleDelete(exam.examinationId)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Modal (kept as-is) */}
      <Modal
        show={showUnitModal}
        onHide={() => {
          setShowUnitModal(false);
          setActiveExaminationId(null);
          setIsUnitEditMode(false);
        }}
        size="lg"
        className="unit-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>📚 Unit Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Subject summary */}
          <div className="mb-3">
            <div className="fw-bold">
              <span className="text-primary">Subject : {form.paperCode}</span>
              {" - "}
              <span className="text-primary">{form.paperName}</span>
              {" ("}
              <span className="text-primary">{form.batchName}</span>
              {"/"}
              <span className="text-primary">{form.semester}</span>
              {")"}
            </div>
          </div>

          <div className="mb-3">
            <Button
              variant={isUnitEditMode ? "secondary" : "warning"}
              onClick={() => setIsUnitEditMode(!isUnitEditMode)}
            >
              {isUnitEditMode ? "🔒 Cancel Edit" : "✏️ Edit Units"}
            </Button>
          </div>

          <Table bordered size="sm">
            <thead>
              <tr className="text-center">
                <th>Unit</th>
                <th>Title</th>
                <th>Hours</th>
                <th>Minutes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit, index) => {
                const [hours, minutes] = unit.duration.split(" ").map(Number);
                return (
                  <tr key={index}>
                    <td className="text-center">Unit {index + 1}</td>
                    <td>
                      <Form.Control
                        type="text"
                        placeholder="Enter Unit Title"
                        value={unit.title}
                        disabled={!isUnitEditMode}
                        onChange={(e) => {
                          const newUnits = [...units];
                          newUnits[index].title = e.target.value;
                          setUnits(newUnits);
                        }}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min="0"
                        value={hours}
                        disabled={!isUnitEditMode}
                        onChange={(e) => {
                          const newUnits = [...units];
                          const updatedMinutes = unit.duration.split(" ")[1];
                          newUnits[index].duration = `${e.target.value} ${updatedMinutes}`;
                          setUnits(newUnits);
                        }}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min="0"
                        value={minutes}
                        disabled={!isUnitEditMode}
                        onChange={(e) => {
                          const newUnits = [...units];
                          const updatedHours = unit.duration.split(" ")[0];
                          newUnits[index].duration = `${updatedHours} ${e.target.value}`;
                          setUnits(newUnits);
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <Button
                        size="sm"
                        variant="outline-danger"
                        disabled={!isUnitEditMode}
                        onClick={() => {
                          const newUnits = [...units];
                          newUnits.splice(index, 1);
                          setUnits(newUnits.map((u, i) => ({ ...u, unitNo: i + 1 })));
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {isUnitEditMode && (
            <div className="action-buttons mt-3 d-flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  const newUnit = { unitNo: units.length + 1, title: "", duration: "0 0" };
                  setUnits([...units, newUnit]);
                }}
              >
                ➕ Add Unit
              </Button>

              <Button
                variant="success"
                onClick={async () => {
                  try {
                    if (!activeExaminationId) {
                      toast.error("❌ Examination ID missing for units");
                      return;
                    }
                    for (let i = 0; i < units.length; i++) {
                      const unit = units[i];
                      const [hours, minutes] = unit.duration.split(" ").map(Number);
                      if (!unit.title?.trim()) {
                        toast.error(`❌ Unit ${i + 1}: Title is required`);
                        return;
                      }
                      if (isNaN(hours)) {
                        toast.error(`❌ Unit ${i + 1}: Hours is required`);
                        return;
                      }
                      if (isNaN(minutes)) {
                        toast.error(`❌ Unit ${i + 1}: Minutes is required`);
                        return;
                      }
                    }
                    const payload = units.map((u) => {
                      const [hours, minutes] = u.duration.split(" ").map(Number);
                      return {
                        unitId: u.unitId || 0,
                        examinationId: activeExaminationId,
                        unitNumber: u.unitNo,
                        title: u.title,
                        hours,
                        minutes,
                      };
                    });

                    const token = localStorage.getItem("jwt");
                    const res = await fetch(`${API_BASE_URL}/Examination/insertmultiunits`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify(payload),
                    });

                    const result = await res.json();
                    if (res.ok) {
                      toast.success("✅ Units saved successfully");
                      setShowUnitModal(false);
                      setActiveExaminationId(null);
                      setIsUnitEditMode(false);
                    } else {
                      throw new Error(result.message || "Save failed");
                    }
                  } catch (err) {
                    toast.error("Failed to save units");
                  }
                }}
              >
                💾 Save Units
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default SubjectsBankTab;
