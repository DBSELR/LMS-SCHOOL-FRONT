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
    item.paperName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.paperCode.toLowerCase().includes(searchTerm.toLowerCase())
);


  const [activeExaminationId, setActiveExaminationId] = useState(null);
  const [isUnitEditMode, setIsUnitEditMode] = useState(false);

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [units, setUnits] = useState([
    {
      unitNo: 1,
      title: "",
      duration: "0 0",
    },
  ]);

  const hourOptions = Array.from({ length: 1000 }, (_, i) => i.toString());
  const minuteOptions = Array.from({ length: 1000 }, (_, i) => i.toString());

  const [form, setForm] = useState({
    batchName: "",
    semester: "",
    paperCode: "",
    paperName: "",
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
    totalInternalMax: 0,
    totalInternalPass: 0,
    totalMax: 0,
    totalPass: 0,
    examinationId: null,
    unitCount: 0,
  });

  useEffect(() => {
    if (isActive) {
      console.log("📥 isActive triggered: fetching data...");
      fetchInitialData();
      setSubBank([]);
      fetchSubBank([]);
    }
  }, [isActive]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch(
        `${API_BASE_URL}/Examination/GetBatch`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      console.log("📦 FETCHED: Batches", data);
      if (!Array.isArray(data)) return;
      const uniqueBatches = [...new Set(data.map((item) => item.batchName))];
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
        `${API_BASE_URL}/Examination/GetSubjectbankSems?batch=${batch}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      console.log("📦 FETCHED: Semesters", data);
      const semList = data.map((item) => item.sem);
      setSemesters(semList);
    } catch (err) {
      toast.error("Failed to fetch semesters");
      console.error("❌ Error fetching semesters", err);
    }
  };

  const fetchSubBank = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `${API_BASE_URL}/Examination/GetSubBank`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      console.log("📦 FETCHED: SubBank", data);
      setSubBank(data);
    } catch (err) {
      toast.error("Failed to fetch subjects");
      console.error("❌ Error fetching SubBank", err);
    }
  };

  const fetchCGData = async (batch, sem) => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `${API_BASE_URL}/COURSE/GetProgrammeandgroups?Batch=${batch}&SEM=${sem}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      console.log("📦 FETCHED: CG Data", data);
      setCgData(data);
    } catch (err) {
      toast.error("Failed to fetch Course/Group");
      console.error("❌ Error fetching CG data", err);
    }
  };

  useEffect(() => {
    if (form.batchName && form.semester) {
      fetchCGData(form.batchName, form.semester);
    }
  }, [form.batchName, form.semester]);

  useEffect(() => {
    if (cgData.length) {
      const filtered = cgData.map((cg) => ({
        value: cg.cGId,
        label: cg.cGName,
        courseId: cg.cGId.split("_")[0],
        groupId: cg.cGId.split("_")[1],
        batchName: cg.batchName,
      }));
      console.log("🎯 FILTERED CG Options", filtered);
      setFilteredCGOptions(filtered);
    } else {
      setFilteredCGOptions([]);
    }
  }, [cgData]);

  useEffect(() => {
    const internalMax1 = Number(form.internalMax1) || 0;
    const internalMax2 = Number(form.internalMax2) || 0;
    const internalPass1 = Number(form.internalPass1) || 0;
    const internalPass2 = Number(form.internalPass2) || 0;
    const theoryMax = Number(form.theoryMax) || 0;
    const theoryPass = Number(form.theoryPass) || 0;

    const InternalMax = internalMax1 + internalMax2;
    const InternalPass = internalPass1 + internalPass2;
    const totalMax = InternalMax + theoryMax;
    const totalPass = InternalPass + theoryPass;

    const newForm = {
      ...form,
      InternalMax,
      InternalPass,
      totalMax,
      totalPass,
    };

    setForm(newForm);
    console.log("📝 Updated Form Values:", newForm);
  }, [
    form.internalMax1,
    form.internalMax2,
    form.internalPass1,
    form.internalPass2,
    form.theoryMax,
    form.theoryPass,
  ]);

  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    console.log(`🧾 Changed: ${name} = ${newValue}`);

    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    if (name === "batchName") {
      await fetchSemesters(value);
      setForm((prev) => ({ ...prev, semester: "" }));
      setCgData([]);
      setSelectedCG([]);
    }

    if (name === "semester") {
      setSelectedCG([]);
    }
  };

  const handleEdit = async (exam) => {
    console.log("✏️ Editing subject:", exam);
    await fetchSemesters(exam.batchName);

    setForm({
      ...exam,
      batchName: exam.batchName,
      isElective: exam.isElective || false,
      semester: exam.semester.toString(),
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
    console.log("🔁 Resetting form...");
    setForm({
      batchName: "",
      semester: "",
      paperCode: "",
      paperName: "",
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
      totalInternalMax: 0,
      totalInternalPass: 0,
      totalMax: 0,
      totalPass: 0,
      examinationId: null,
      unitCount: 0,
    });
    setSelectedCG([]);
    setSemesters([]);
    setCgData([]);
    setFilteredCGOptions([]);
  };

  const handleSubmit = async () => {
    const {
      examinationId,
      batchName,
      semester,
      paperCode,
      paperName,
      isElective,
      paperType,
      credits,
      internalMax1,
      internalPass1,
      internalMax2,
      internalPass2,
      theoryMax,
      theoryPass,
      InternalMax,
      InternalPass,
      totalMax,
      totalPass,
    } = form;

    if (!batchName || !semester || !paperCode) {
      toast.error("Please fill all required fields");
      return;
    }

    const method = examinationId ? "PUT" : "POST";
    const endpoint = examinationId
      ? `${API_BASE_URL}/Examination/Update/${examinationId}`
      : `${API_BASE_URL}/Examination/Create`;

    let hasError = false;

    for (const cg of selectedCG) {
      const payload = {
        batchName,
        semester: parseInt(semester),
        paperCode,
        paperName,
        isElective,
        paperType,
        credits: parseInt(credits),
        internalMax1: parseInt(internalMax1),
        internalPass1: parseInt(internalPass1),
        internalMax2: parseInt(internalMax2),
        internalPass2: parseInt(internalPass2),
        InternalMax: parseInt(InternalMax ?? 0),
        InternalPass: parseInt(InternalPass ?? 0),
        theoryMax: parseInt(theoryMax),
        theoryPass: parseInt(theoryPass),
        totalMax: parseInt(totalMax),
        totalPass: parseInt(totalPass),
      };

      if (examinationId) {
        payload.examinationId = Number(examinationId);
      }

      console.log("📤 Submitting payload for CG:", cg.label, payload);

      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Submit failed for", cg.label, ":", errorText);
          toast.error(`❌ ${cg.label} failed: ${errorText}`);
          hasError = true;
        } else {
          console.log(`✅ ${cg.label} submitted successfully`);
        }
      } catch (err) {
        console.error("❌ Submit error for", cg.label, ":", err);
        toast.error(`❌ ${cg.label} error: ${err.message}`);
        hasError = true;
      }
    }

    if (!hasError) {
      toast.success("✅ subject saved successfully");
      resetForm();
      setSelectedCG([]);
      fetchInitialData();
      fetchSubBank();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subject?")) return;

    console.log("🗑️ Deleting subject with ID:", id);

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `${API_BASE_URL}/Examination/Delete/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }

      toast.success("Subject Deleted successfully");
      fetchInitialData();
      fetchSubBank();
    } catch (err) {
      console.error("❌ Delete error:", err);
      toast.error(err.message || "Delete failed");
    }
  };

  const fetchUnitsByExamId = async (exam) => {
    try {
      const token = localStorage.getItem("jwt");
      // ⬇️ Set the subject info to show in modal header
      setForm((prev) => ({
        ...prev,
        batchName: exam.batchName,
        semester: exam.semester?.toString() || "",
        paperCode: exam.paperCode,
        paperName: exam.paperName,
      }));

      // ⬇️ Fetch units from backend
      const res = await fetch(
        `${API_BASE_URL}/Examination/GetSubjectUnitsById/${exam.examinationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      console.log("📦 FETCHED UNITS:", data);

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
      console.error("❌ Error fetching units", err);
      toast.error("Failed to fetch units");
    }
  };

  return (
    <div className="container py-4">
      {/* <div ref={formRef} className="mb-4 p-4 rounded bg-glass border shadow-sm">
        <h5 className="mb-4 text-primary">Add / Edit Subject</h5>
        <Form>
          <Row className="g-3">
            <Col md={4}>
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

            <Col md={4}>
              <Form.Label>Semester</Form.Label>
              <Form.Control
                as="select"
                name="semester"
                value={form.semester}
                onChange={handleChange}
              >
                <option value="">Select Semester</option>
                {semesters.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Form.Control>
            </Col>

            <Col md={4}>
              <Form.Label>Programme / Group</Form.Label>
              <Select
                isMulti
                name="courseGroup"
                options={filteredCGOptions}
                value={selectedCG}
                onChange={setSelectedCG}
              />
            </Col>
          </Row>

          <hr className="my-4" />

          <Row className="g-3">
            <Col md={3}>
              <Form.Group style={{ minWidth: "180px", width: "100%" }}>
                <Form.Label>Paper Code</Form.Label>
                <Form.Control
                  name="paperCode"
                  value={form.paperCode}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group style={{ minWidth: "180px", width: "100%" }}>
                <Form.Label>Paper Name</Form.Label>
                <Form.Control
                  name="paperName"
                  value={form.paperName}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group style={{ minWidth: "180px", width: "100%" }}>
                <Form.Label>Paper Type</Form.Label>
                <Form.Control
                  as="select"
                  name="paperType"
                  value={form.paperType}
                  onChange={handleChange}
                >
                  <option>Theory</option>
                  <option>Practical</option>
                  <option>Project</option>
                </Form.Control>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group style={{ minWidth: "180px", width: "100%" }}>
                <Form.Label>Credits</Form.Label>
                <Form.Control
                  type="number"
                  name="credits"
                  value={form.credits}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group>
            <Form.Check
              type="checkbox"
              label="Is Elective?"
              name="isElective"
              checked={form.isElective}
              onChange={handleChange}
              style={{ padding: "0px" }}
            />
          </Form.Group>

          <Row className="g-3"></Row>

          <hr className="my-4" />

          <h6 className="mt-4 mb-3">🧮 Marks Overview</h6>
          <Table bordered className="marks-table w-100">
            <thead>
              <tr className="text-center bg-light">
                <th>Component</th>
                <th>Max</th>
                <th>Pass</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>🧮 Internal Marks - 1</td>
                <td>
                  <Form.Control
                    type="number"
                    name="internalMax1"
                    value={form.internalMax1}
                    onChange={handleChange}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    name="internalPass1"
                    value={form.internalPass1}
                    onChange={handleChange}
                  />
                </td>
              </tr>
              <tr>
                <td>🧮 Internal Marks - 2</td>
                <td>
                  <Form.Control
                    type="number"
                    name="internalMax2"
                    value={form.internalMax2}
                    onChange={handleChange}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    name="internalPass2"
                    value={form.internalPass2}
                    onChange={handleChange}
                  />
                </td>
              </tr>
              <tr className="table-success fw-bold">
                <td>✅ Total Internal Marks</td>
                <td>
                  <Form.Control
                    type="number"
                    name="InternalMax"
                    value={form.InternalMax}
                    readOnly
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    name="InternalPass"
                    value={form.InternalPass}
                    readOnly
                  />
                </td>
              </tr>
              <tr>
                <td>📝 Theory Marks</td>
                <td>
                  <Form.Control
                    type="number"
                    name="theoryMax"
                    value={form.theoryMax}
                    onChange={handleChange}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    name="theoryPass"
                    value={form.theoryPass}
                    onChange={handleChange}
                  />
                </td>
              </tr>
              <tr className="table-primary fw-bold">
                <td>✅ Total Marks</td>
                <td>
                  <Form.Control
                    type="number"
                    name="totalMax"
                    value={form.totalMax}
                    readOnly
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    name="totalPass"
                    value={form.totalPass}
                    readOnly
                  />
                </td>
              </tr>
            </tbody>
          </Table>

          <div className="text-center">
            <Button
              variant="success"
              className="rounded-pill px-4"
              onClick={handleSubmit}
            >
              {form.examinationId ? "Update" : "Save"}
            </Button>
          </div>
        </Form>
      </div> */}

<div className="row">
  {/* Add / Edit Subject */}
  <div className="col-12 col-lg-6 mb-4">
    <div className="p-0 rounded bg-glass border shadow-sm" style={{ height: "500px", display: "flex", flexDirection: "row" }}>
      <div ref={formRef} className="p-4 overflow-auto custom-scrollbar" style={{ flex: 1, scrollMarginRight:'20px', }}>
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

                <Col md={6}>
                  <Form.Label>Semester</Form.Label>
                  <Form.Control
                    as="select"
                    name="semester"
                    value={form.semester}
                    onChange={handleChange}
                  >
                    <option value="">Select Semester</option>
                    {semesters.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Form.Control>
                </Col>
              </Row>

              <Col md={12}>
                <Form.Label>Programme / Group</Form.Label>
                <Select
                  isMulti
                  name="courseGroup"
                  options={filteredCGOptions}
                  value={selectedCG}
                  onChange={setSelectedCG}
                />
              </Col>

              <hr className="my-4" />

              <Row className="g-3">
                <Col md={3}>
                  <Form.Group style={{}}>
                    <Form.Label>Paper Code</Form.Label>
                    <Form.Control
                      name="paperCode"
                      value={form.paperCode}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={9}>
                  <Form.Group style={{}}>
                    <Form.Label>Paper Name</Form.Label>
                    <Form.Control
                      name="paperName"
                      value={form.paperName}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="g-3">
                <Col md={6}>
                  <Form.Group style={{}}>
                    <Form.Label>Paper Type</Form.Label>
                    <Form.Control
                      as="select"
                      name="paperType"
                      value={form.paperType}
                      onChange={handleChange}
                    >
                      <option>Theory</option>
                      <option>Practical</option>
                      <option>Project</option>
                    </Form.Control>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Credits</Form.Label>
                    <Form.Control
                      type="number"
                      name="credits"
                      value={form.credits}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group>
                <Form.Check
                  type="checkbox"
                  label="Is Elective?"
                  name="isElective"
                  checked={form.isElective}
                  onChange={handleChange}
                  style={{ padding: "0px" }}
                />
              </Form.Group>

              <Row className="g-3"></Row>

              <hr className="my-4" />

              <h6 className="mt-4 mb-3">🧮 Marks Overview</h6>
              <Table bordered className="marks-table w-100">
                <thead>
                  <tr className="text-center bg-light">
                    <th>Component</th>
                    <th>Max</th>
                    <th>Pass</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>🧮 Internal Marks - 1</td>
                    <td>
                      <Form.Control
                        type="number"
                        name="internalMax1"
                        value={form.internalMax1}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        name="internalPass1"
                        value={form.internalPass1}
                        onChange={handleChange}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>🧮 Internal Marks - 2</td>
                    <td>
                      <Form.Control
                        type="number"
                        name="internalMax2"
                        value={form.internalMax2}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        name="internalPass2"
                        value={form.internalPass2}
                        onChange={handleChange}
                      />
                    </td>
                  </tr>
                  <tr className="table-success fw-bold">
                    <td>✅ Total Internal Marks</td>
                    <td>
                      <Form.Control
                        type="number"
                        name="InternalMax"
                        value={form.InternalMax}
                        readOnly
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        name="InternalPass"
                        value={form.InternalPass}
                        readOnly
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>📝 Theory Marks</td>
                    <td>
                      <Form.Control
                        type="number"
                        name="theoryMax"
                        value={form.theoryMax}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        name="theoryPass"
                        value={form.theoryPass}
                        onChange={handleChange}
                      />
                    </td>
                  </tr>
                  <tr className="table-primary fw-bold">
                    <td>✅ Total Marks</td>
                    <td>
                      <Form.Control
                        type="number"
                        name="totalMax"
                        value={form.totalMax}
                        readOnly
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        name="totalPass"
                        value={form.totalPass}
                        readOnly
                      />
                    </td>
                  </tr>
                </tbody>
              </Table>

              <div className="text-center">
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

        {/* 📋 Saved Subjects */}
  <div className="col-12 col-lg-6 mb-4">
    <div className="p-0 rounded bg-white border shadow-sm " style={{ height: "500px", display: "flex", flexDirection: "row" }}>
      <div className="p-4 overflow-auto custom-scrollbar" style={{ flex: 1, scrollMarginRight:'20px', }}>
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
              <th>Sem</th>
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
      <td>{exam.semester}</td>
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

      {/* Unit Modal */}
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
          {/* Subject Summary Header */}
          <div className="mb-3">
            <div className="fw-bold">
              <span className="text-primary">Subject : {form.paperCode}</span>
              {"-"}
              <span className="text-primary">{form.paperName}</span>
              {" ("}
              {/* &nbsp;/&nbsp; */}
              <span className="text-primary">{form.batchName}</span>
              {"/"}
              <span className="text-primary">{form.semester}</span>
              {")"}
              {/* &nbsp;/&nbsp; */}

              {/* &nbsp;/&nbsp; */}
            </div>
          </div>

          {/* Toggle Edit Button */}
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
                          newUnits[
                            index
                          ].duration = `${e.target.value} ${updatedMinutes}`;
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
                          newUnits[
                            index
                          ].duration = `${updatedHours} ${e.target.value}`;
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
                          setUnits(
                            newUnits.map((u, i) => ({ ...u, unitNo: i + 1 }))
                          );
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

          {/* Action Buttons */}
          {isUnitEditMode && (
            <div className="action-buttons mt-3 d-flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  const newUnit = {
                    unitNo: units.length + 1,
                    title: "",
                    duration: "0 0",
                  };
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

                    // Validation: Check if any unit is incomplete
                    for (let i = 0; i < units.length; i++) {
                      const unit = units[i];
                      const [hours, minutes] = unit.duration
                        .split(" ")
                        .map(Number);

                      if (!unit.title || unit.title.trim() === "") {
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
                      const [hours, minutes] = u.duration
                        .split(" ")
                        .map(Number);
                      return {
                        unitId: u.unitId || 0,
                        examinationId: activeExaminationId,
                        unitNumber: u.unitNo,
                        title: u.title,
                        hours,
                        minutes,
                      };
                    });

                    console.log("📤 POSTING UNITS:", payload);
                   const token = localStorage.getItem("jwt");
                    const res = await fetch(
                      `${API_BASE_URL}/Examination/insertmultiunits`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify(payload),
                      }
                    );

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
                    console.error("❌ Save units error", err);
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
