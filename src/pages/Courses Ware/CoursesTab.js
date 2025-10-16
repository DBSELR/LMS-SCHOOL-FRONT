import React, { useEffect, useState, useMemo } from "react";
import { Form, Button, Collapse } from "react-bootstrap";
import { toast } from "react-toastify";
import { FaChevronDown, FaChevronUp, FaEdit, FaTrash } from "react-icons/fa";
import API_BASE_URL from "../../config";

const DEBUG = true;

/* ========= helpers to safely read batches from API (works with many shapes) ========= */
const isIsoDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s);
const isSlashDate = (s) =>
  typeof s === "string" && /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s);
const isMsAjaxDate = (s) => typeof s === "string" && /\/Date\(\d+\)\//.test(s);

function toIsoFromMsAjax(s) {
  try {
    const ms = Number((s.match(/\/Date\((\d+)\)\//) || [])[1]);
    if (!Number.isFinite(ms)) return "";
    return new Date(ms).toISOString();
  } catch {
    return "";
  }
}
function toIsoFromSlash(s) {
  const m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}T00:00:00`;
}
const looksLikeDateString = (x) => {
  if (typeof x !== "string") return false;
  return (
    isIsoDate(x) ||
    isSlashDate(x) ||
    isMsAjaxDate(x) ||
    !isNaN(new Date(x).getTime())
  );
};

function ci(obj) {
  const map = {};
  Object.keys(obj || {}).forEach((k) => (map[k.toLowerCase()] = obj[k]));
  return (keys) => {
    for (const k of keys) {
      const v = map[k.toLowerCase()];
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  };
}

function normalizeFromArray(arr) {
  let bid = 0,
    batchName = "",
    startDate = "",
    endDate = "";
  if (!Array.isArray(arr)) return { bid, batchName, startDate, endDate };

  const idCandidate = arr.find(
    (v) => typeof v === "number" && Number.isFinite(v)
  );
  if (idCandidate !== undefined) bid = Number(idCandidate);

  const strings = arr.filter((v) => typeof v === "string");
  const dateCandidates = strings.filter(looksLikeDateString);
  if (dateCandidates[0]) startDate = dateCandidates[0];
  if (dateCandidates[1]) endDate = dateCandidates[1];

  const nameCandidate = strings.find((s) => s && !looksLikeDateString(s));
  if (nameCandidate) batchName = String(nameCandidate);

  // Common order: [Bid, BatchName, StartDate, EndDate, ...]
  if (!batchName && typeof arr[1] === "string") batchName = arr[1];
  if (!startDate && typeof arr[2] === "string") startDate = arr[2];
  if (!endDate && typeof arr[3] === "string") endDate = arr[3];

  return { bid, batchName, startDate, endDate };
}

function normalizeBatchDto(dto) {
  if (Array.isArray(dto)) return normalizeFromArray(dto);
  const get = ci(dto || {});
  const bid = get(["Bid", "BID", "bid", "Id", "ID"]) ?? 0;
  const batchName =
    get([
      "BatchName",
      "batchName",
      "Batch",
      "BATCH",
      "Name",
      "NAME",
      "Batch_Title",
      "Batch_Name",
    ]) ?? "";
  const startDate =
    get([
      "StartDate",
      "startDate",
      "Start",
      "StartDt",
      "Start_Date",
      "FromDate",
      "From",
    ]) ?? "";
  const endDate =
    get(["EndDate", "endDate", "End", "EndDt", "End_Date", "ToDate", "To"]) ??
    "";
  return {
    bid: Number(bid) || 0,
    batchName: String(batchName || ""),
    startDate,
    endDate,
  };
}

async function getAllBatches(token) {
  const url = `${API_BASE_URL}/Programme/GetAllBatch`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  let data;
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    data = [];
  }

  if (!Array.isArray(data)) {
    const wrapped = (data && (data.data || data.result || data.items)) || [];
    if (!Array.isArray(wrapped))
      throw new Error("GetAllBatch did not return an array");
    return wrapped;
  }
  return data;
}

/* =================================== Component =================================== */
const CoursesTab = ({ isActive }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({});

  // batches
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesErr, setBatchesErr] = useState("");

  const [form, setForm] = useState({
    batchName: "",
    courseCode: "",
    courseName: "",
    fee: "",
    courseId: null,
  });

  // fetch courses when tab becomes active
  useEffect(() => {
    if (isActive) {
      fetchCourses();
      fetchBatchesDD();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Programme/All`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const normalized = data.map((course) => ({
        ...course,
        isCertCourse: course.isCertCourse ?? course.IsCertCourse ?? false,
        isNoGrp: course.isNoGrp ?? course.IsNoGrp ?? false,
      }));
      setCourses(normalized);
      if (DEBUG) console.log("Loaded Programmes:", normalized);
    } catch (e) {
      toast.error("❌ Failed to fetch courses", { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchesDD = async () => {
    setBatchesLoading(true);
    setBatchesErr("");
    try {
      const token = localStorage.getItem("jwt");
      const raw = await getAllBatches(token);
      const normalized = raw.map(normalizeBatchDto).filter((x) => x.batchName);
      // Sort alphabetically for nice UX
      normalized.sort((a, b) => a.batchName.localeCompare(b.batchName));
      if (DEBUG) console.log("✅ Batches for dropdown:", normalized);
      setBatches(normalized);
    } catch (err) {
      setBatchesErr(err.message || "Failed to load batches");
      if (DEBUG) console.error("❌ GetAllBatch:", err);
      toast.error("❌ Failed to load batches", { autoClose: 3000 });
    } finally {
      setBatchesLoading(false);
    }
  };

  // ====== FIX 1: derive courseName from the selected courseCode (AP-Andhra Pradesh) ======
  const handleChange = (e) => {
    const { name, value } = e.target;

    console.log(`🔄 handleChange: ${name} = ${value}`);

    if (name === "courseCode") {
      let next = { ...form, courseCode: value };
      if (value && value.includes("-")) {
        const [, right] = value.split("-", 2);
        next.courseName = (right || "").trim();
        console.log(`📝 Derived courseName: ${next.courseName}`);
      } else if (!form.courseName) {
        next.courseName = "";
      }
      setForm(next);
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (course) => {
    // Create the combined courseCode value that matches the dropdown options
    const combinedCourseCode = `${course.programmeCode}-${course.programmeName}`;
    
    console.log("🔄 Editing course:", {
      original: course,
      combinedCourseCode,
      programmeCode: course.programmeCode,
      programmeName: course.programmeName
    });
    
    setForm({
      batchName: course.batchName ?? "",
      courseCode: combinedCourseCode, // Use combined format
      courseName: course.programmeName ?? "",
      fee: course.fee ?? "",
      courseId: course.programmeId ?? null,
    });
    // If editing shows a batch name that isn't in the dropdown (older data), we handle it below via memo
  };

  const handleDelete = async (courseId) => {
    toast.dismiss();
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Programme/${courseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const errorText = await res.text();
      if (!res.ok) throw new Error(errorText || "Delete failed");

      toast.success("🗑️ Board Deleted successfully", { autoClose: 3000 });
      fetchCourses();
    } catch (err) {
      toast.error(`❌ Deletion failed: ${err.message}`, { autoClose: 3000 });
    }
  };

  const handleSaveOrUpdate = async () => {
    toast.dismiss();

    const { courseCode, courseName, fee, courseId } = form;

    // ====== FIX 2: only require Board + Fee; name is derived or split on backend ======
    if (!courseCode || !fee) {
      toast.error("❌ Please select a Board and enter Total Fee", {
        autoClose: 3000,
      });
      return;
    }

    // Derive name from code if not set
    let derivedName = courseName?.trim();
    if (!derivedName && courseCode.includes("-")) {
      const [, right] = courseCode.split("-", 2);
      derivedName = (right || "").trim();
    }

    // If there's no hyphen and no name, block it
    if (!derivedName && !courseCode.includes("-")) {
      toast.error("❌ Please provide a valid Board selection", {
        autoClose: 3000,
      });
      return;
    }

    const payload = {
      programmeName: derivedName || "", // backend will ignore if hyphen present and split
      programmeCode: courseCode, // send combined like "AP-Andhra Pradesh"
      numberOfSemesters: 1,
      fee: parseFloat(fee),
      installments: 1,
      isCertCourse: false,
      isNoGrp: false,
    };

    try {
      const token = localStorage.getItem("jwt");
      const url = courseId
        ? `${API_BASE_URL}/Programme/Update/${courseId}`
        : `${API_BASE_URL}/Programme`;
      const method = courseId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const errorText = await res.text();
      if (!res.ok) throw new Error(errorText || "Save failed");

      toast.success(
        `✅ Board ${courseId ? "updated" : "created"} successfully`,
        {
          autoClose: 3000,
        }
      );

      setForm({
        batchName: "",
        courseCode: "",
        courseName: "",
        fee: "",
        courseId: null,
      });

      fetchCourses();
    } catch (err) {
      toast.error(`❌ Save failed: ${err.message}`, { autoClose: 3000 });
    }
  };

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  // If editing a record whose batchName isn't present in fetched batches, include it once at top
  const batchOptions = useMemo(() => {
    const names = new Set(batches.map((b) => b.batchName));
    const list = [...batches];
    if (form.batchName && !names.has(form.batchName)) {
      list.unshift({ bid: -1, batchName: form.batchName });
    }
    return list;
  }, [batches, form.batchName]);

  return (
    <div className="container py-0 pt-0 welcome-card animate-welcome">
      <div className="mb-0 bg-glass p-0">
        <h5 className="mb-0 mt-0 text-primary">Add / Edit Boards</h5>
        <Form>
          <div className="row gy-3">
            {/* Board dropdown (combined value like AP-Andhra Pradesh) */}
            <div className="col-md-4">
              <Form.Group>
                <Form.Label>Board</Form.Label>
                <Form.Control
                  as="select"
                  name="courseCode"
                  value={form.courseCode || ""}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Board</option>
                  {[
                    "AP-Andhra Pradesh",
                    "TG-Telangana", 
                    "CB-Central Board",
                    "IC-International",
                  ].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  {/* If form has a courseCode that doesn't match predefined options, add it */}
                  {form.courseCode && 
                   !["AP-Andhra Pradesh", "TG-Telangana", "CB-Central Board", "IC-International"].includes(form.courseCode) && (
                    <option key={form.courseCode} value={form.courseCode}>
                      {form.courseCode}
                    </option>
                  )}
                </Form.Control>
              </Form.Group>
            </div>

            {/* Board Name field intentionally removed/commented; name is auto-derived */}
            {/*
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Board Name</Form.Label>
                <Form.Control
                  name="courseName"
                  value={form.courseName}
                  onChange={handleChange}
                />
              </Form.Group>
            </div>
            */}

            <div className="col-md-4">
              <Form.Group>
                <Form.Label>Total Fee</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="fee"
                  value={form.fee}
                  onChange={handleChange}
                />
              </Form.Group>
            </div>

            <div className="col-12 col-md-4 d-flex align-items-center mt-4 gap-2">
              <Button
                variant="success"
                className="w-75 w-md-auto"
                onClick={handleSaveOrUpdate}
              >
                {form.courseId ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </Form>
      </div>

      <h5 className="mb-3">Boards</h5>

      <div className="semester-panel-body">
        {loading ? (
          <p>Loading...</p>
        ) : (
          courses.map((course) => (
            <div key={course.programmeId} style={{ margin: "10px" }}>
              <button
                className="w-100 btn btn-dark text-start"
                onClick={() => toggle(course.programmeId)}
              >
                {course.batchName} | {course.programmeCode} -{" "}
                {course.programmeName} | Fee: ₹{course.fee}
                {open[course.programmeId] ? (
                  <FaChevronUp className="float-end" />
                ) : (
                  <FaChevronDown className="float-end" />
                )}
              </button>
              <Collapse in={open[course.programmeId]}>
                <div
                  className="bg-white border p-3"
                  style={{ transition: "all 0.3s", minHeight: "120px" }}
                >
                  <p>
                    <strong>Batch:</strong> {course.batchName}
                  </p>
                  <p>
                    <strong>Code:</strong> {course.programmeCode}
                  </p>
                  <p>
                    <strong>Name:</strong> {course.programmeName}
                  </p>
                  <p>
                    <strong>Fee:</strong> ₹{course.fee}
                  </p>
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="info"
                      onClick={() => handleEdit(course)}
                    >
                      <i className="fa-solid fa-pen-to-square" ></i>
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(course.programmeId)}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </Button>
                  </div>
                </div>
              </Collapse>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CoursesTab;
