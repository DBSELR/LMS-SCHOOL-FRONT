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
    /* Assuming Row, Col, Form, Button, Table, Modal etc. are already imported */
<div className="container py-0 pt-0 welcome-card animate-welcome">
  <div className="row g-3">
    {/* Add / Edit Subject */}
    <div className="col-12 col-lg-6">
      <div className="card-subject bg-glass rounded border shadow-sm">
        <div
          ref={formRef}
          className="subject-body custom-scrollbar"
        >
          <h5 className="mb-2 text-primary">Add / Edit Subject</h5>

          <Form>
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Batch</Form.Label>
                  <Form.Control
                    as="select"
                    name="batchName"
                    value={form.batchName}
                    onChange={handleChange}
                  >
                    <option value="">Select Batch</option>
                    {(batches || []).map((b, i) => (
                      /* support primitive or object batch */
                      <option key={i} value={b && typeof b === "object" ? (b.id ?? b.value ?? b.name) : b}>
                        {b && typeof b === "object" ? (b.name ?? b.value ?? JSON.stringify(b)) : b}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Board / Class</Form.Label>
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
                    classNamePrefix="react-select"
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr className="my-3" />

            <Row className="g-3">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Paper Code</Form.Label>
                  <Form.Control name="paperCode" value={form.paperCode} onChange={handleChange} />
                </Form.Group>
              </Col>

              <Col xs={12} md={8}>
                <Form.Group>
                  <Form.Label>Paper Name</Form.Label>
                  <Form.Control name="paperName" value={form.paperName} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-center mt-3">
              <Button variant="success" className="rounded-pill px-4" onClick={handleSubmit} type="button">
                {form.examinationId ? "Update" : "Save"}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>

    {/* Saved Subjects */}
    <div className="col-12 col-lg-6">
      <div className="card-subject bg-white rounded border shadow-sm">
        <div className="subject-body custom-scrollbar">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 ml-2 gap-2">
            <h5 className="mb-1">📋 Saved Subjects</h5>
            <input
              type="text"
              className="form-control ms-sm-3 search-input"
              placeholder="Search by Name or Code"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-wrapper">
            <div className="table-responsive">
              <Table bordered striped hover size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Paper Code</th>
                    <th>Paper Name</th>
                    <th>Units</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(filteredSubjects || [])
                    .filter((exam) => exam) // Filter out null or undefined values
                    .map((exam) => (
                      <tr key={exam.examinationId ?? `${exam.paperCode}-${exam.batchName}`}>
                        <td>{exam.batchName}</td>
                        <td>{exam.paperCode}</td>
                        <td className="text-start">{exam.paperName}</td>
                        <td>
                          <Button size="sm" variant="link" onClick={() => fetchUnitsByExamId(exam)}>
                            ➕ {exam.unitCount != null ? `(${exam.unitCount})` : ""}
                          </Button>
                        </td>
                        <td className="actions-cell">
                          <Button size="sm" variant="outline-primary" onClick={() => handleEdit(exam)} className="me-1 mb-2 mb-sm-0">
                            Edit
                          </Button>
                          <Button size="sm" variant="outline-danger" onClick={() => handleDelete(exam.examinationId)} className="mt-1">
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
    </div>
  </div>

  {/* Unit Modal (responsive + scrollable) */}
  <Modal
    show={showUnitModal}
    onHide={() => {
      setShowUnitModal(false);
      setActiveExaminationId(null);
      setIsUnitEditMode(false);
    }}
    size="lg"
    className="unit-modal"
    centered
  >
    <Modal.Header closeButton>
      <Modal.Title>📚 Unit Details</Modal.Title>
    </Modal.Header>

    <Modal.Body>
      <div className="mb-3">
        <div className="fw-bold">
          <span className="text-primary">Subject : {form.paperCode}</span> - <span className="text-primary">{form.paperName}</span>
          {" ("}
          <span className="text-primary">{form.batchName}</span>/
          <span className="text-primary">{form.semester}</span>
          {")"}
        </div>
      </div>

      <div className="mb-3">
        <Button variant={isUnitEditMode ? "secondary" : "warning"} onClick={() => setIsUnitEditMode(!isUnitEditMode)}>
          {isUnitEditMode ? "🔒 Cancel Edit" : "✏️ Edit Units"}
        </Button>
      </div>

      <div className="table-responsive modal-table-wrap">
        <Table bordered size="sm" className="mb-0">
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
            {(units || []).map((unit, index) => {
              // defensive parse
              const parts = (unit.duration || "0 0").split(/\s+/);
              const hours = Number(parts[0]) || 0;
              const minutes = Number(parts[1]) || 0;
              return (
                <tr key={unit.unitId ?? index}>
                  <td className="text-center">Unit {unit.unitNo ?? index + 1}</td>
                  <td>
                    <Form.Control
                      type="text"
                      placeholder="Enter Unit Title"
                      value={unit.title}
                      disabled={!isUnitEditMode}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index] = { ...newUnits[index], title: e.target.value };
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
                        const prevM = (newUnits[index]?.duration || "0 0").split(/\s+/)[1] || 0;
                        newUnits[index] = { ...newUnits[index], duration: `${e.target.value || 0} ${prevM}` };
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
                        const prevH = (newUnits[index]?.duration || "0 0").split(/\s+/)[0] || 0;
                        newUnits[index] = { ...newUnits[index], duration: `${prevH} ${e.target.value || 0}` };
                        setUnits(newUnits);
                      }}
                    />
                  </td>
                  <td className="text-center">
                    <Button size="sm" variant="outline-danger" disabled={!isUnitEditMode} onClick={() => {
                      const newUnits = [...units];
                      newUnits.splice(index, 1);
                      setUnits(newUnits.map((u, i) => ({ ...u, unitNo: i + 1 })));
                    }}>
                      Delete
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      {isUnitEditMode && (
        <div className="mt-3 d-flex flex-column flex-sm-row gap-2">
          <Button variant="secondary" onClick={() => setUnits([...units, { unitNo: units.length + 1, title: "", duration: "0 0" }])}>
            ➕ Add Unit
          </Button>

          <Button variant="success" onClick={async () => {
            try {
              if (!activeExaminationId) { toast.error("❌ Examination ID missing for units"); return; }
              // validation
              for (let i = 0; i < units.length; i++) {
                const u = units[i]; const parts = (u.duration || "0 0").split(/\s+/); const h = Number(parts[0]); const m = Number(parts[1]);
                if (!u.title?.trim()) { toast.error(`❌ Unit ${i + 1}: Title is required`); return; }
                if (isNaN(h)) { toast.error(`❌ Unit ${i + 1}: Hours is required`); return; }
                if (isNaN(m)) { toast.error(`❌ Unit ${i + 1}: Minutes is required`); return; }
              }
              const payload = units.map(u => { const parts = (u.duration || "0 0").split(/\s+/); return { unitId: u.unitId || 0, examinationId: activeExaminationId, unitNumber: u.unitNo, title: u.title, hours: Number(parts[0]) || 0, minutes: Number(parts[1]) || 0 }; });
              const token = localStorage.getItem("jwt"); if (!token) { toast.error("Session expired"); return; }
              const res = await fetch(`${API_BASE_URL}/Examination/insertmultiunits`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
              const result = await res.json().catch(() => ({}));
              if (!res.ok) { toast.error(result?.message || "Save failed"); return; }
              toast.success("✅ Units saved successfully");
              setShowUnitModal(false); setActiveExaminationId(null); setIsUnitEditMode(false);
            } catch (err) { console.error(err); toast.error("Failed to save units"); }
          }}>
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
