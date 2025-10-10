// File: src/pages/Courses Ware/BatchTab.jsx
import React, { useEffect, useState } from "react";
import { Form, Button, Row, Col, Table, Spinner, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
const DEBUG = true;

/* ===================== Logging helpers ===================== */
async function readBody(res) {
  const text = await res.text().catch(() => "");
  let json;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
  return { text, json };
}
function logRequest(label, { url, method, headers, body }) {
  if (!DEBUG) return;
  console.groupCollapsed(`📤 ${label} REQUEST`);
  console.log("URL:", url);
  console.log("Method:", method);
  console.log("Headers:", headers);
  if (body !== undefined) {
    try { console.log("Body (parsed):", JSON.parse(body)); } catch { console.log("Body (text):", body); }
  }
  console.groupEnd();
}
async function logResponse(label, res) {
  if (!DEBUG) return { text: "", json: undefined };
  const { text, json } = await readBody(res.clone());
  console.groupCollapsed(`📥 ${label} RESPONSE`);
  console.log("ok:", res.ok, "status:", res.status, res.statusText);
  console.log("Headers:");
  res.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));
  console.log("Body (text):", text);
  if (json !== undefined) console.log("Body (json):", json);
  console.groupEnd();
  return { text, json };
}

/* ===================== Date utils (robust) ===================== */
const isIsoDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s);
const isSlashDate = (s) => typeof s === "string" && /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s);
const isMsAjaxDate = (s) => typeof s === "string" && /\/Date\(\d+\)\//.test(s);

function toIsoFromMsAjax(s) {
  try {
    const ms = Number((s.match(/\/Date\((\d+)\)\//) || [])[1]);
    if (!Number.isFinite(ms)) return "";
    const d = new Date(ms);
    return d.toISOString();
  } catch { return ""; }
}

function toIsoFromSlash(s) {
  // supports dd-MM-yyyy or dd/MM/yyyy
  const m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (!m) return "";
  const [ , dd, mm, yyyy ] = m;
  return `${yyyy}-${mm}-${dd}T00:00:00`;
}

const toInputDate = (s) => {
  if (!s) return "";
  if (isIsoDate(s)) return s.includes("T") ? s.split("T")[0] : s.substring(0, 10);
  if (isMsAjaxDate(s)) return toInputDate(toIsoFromMsAjax(s));
  if (isSlashDate(s)) return toInputDate(toIsoFromSlash(s));
  // last resort: try Date(...)
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().substring(0, 10);
  }
  return "";
};

const toIsoMidnight = (dateStr) => `${dateStr}T00:00:00`;

/* ===================== Shape-safe normalizer ===================== */
function ci(obj) {
  // case-insensitive object accessor
  const map = {};
  Object.keys(obj || {}).forEach(k => (map[k.toLowerCase()] = obj[k]));
  return (keyCandidates) => {
    for (const k of keyCandidates) {
      const v = map[k.toLowerCase()];
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  };
}

function looksLikeDateString(x) {
  if (typeof x !== "string") return false;
  return isIsoDate(x) || isSlashDate(x) || isMsAjaxDate(x) || !isNaN(new Date(x).getTime());
}

function normalizeFromArray(arr) {
  // Heuristics:
  // - id: first integer-like number
  // - dates: first two date-like strings
  // - name: first non-empty string that is NOT a date
  let bid = 0, batchName = "", startDate = "", endDate = "";

  if (!Array.isArray(arr)) return { bid, batchName, startDate, endDate };

  const numbers = arr.filter(v => typeof v === "number");
  const strings = arr.filter(v => typeof v === "string");

  // id
  const idCandidate = arr.find(v => typeof v === "number" && Number.isFinite(v));
  if (idCandidate !== undefined) bid = Number(idCandidate);

  // dates
  const dateCandidates = strings.filter(looksLikeDateString);
  if (dateCandidates[0]) startDate = dateCandidates[0];
  if (dateCandidates[1]) endDate = dateCandidates[1];

  // name
  const nameCandidate = strings.find(s => s && !looksLikeDateString(s));
  if (nameCandidate) batchName = String(nameCandidate);

  // Fallback: common ordering [Bid, BatchName, StartDate, EndDate, ...]
  if (!batchName && typeof arr[1] === "string") batchName = arr[1];
  if (!startDate && typeof arr[2] === "string") startDate = arr[2];
  if (!endDate && typeof arr[3] === "string") endDate = arr[3];

  return { bid, batchName, startDate, endDate };
}

function normalizeBatchDto(dto) {
  // Supports:
  // 1) Object with any casing or alternative keys
  // 2) Array rows
  if (Array.isArray(dto)) return normalizeFromArray(dto);

  const get = ci(dto || {});
  const bid =
    get(["Bid", "BID", "bid", "Id", "ID"]) ?? 0;
  const batchName =
    get(["BatchName", "batchName", "Batch", "BATCH", "Name", "NAME", "Batch_Title", "Batch_Name"]) ?? "";
  const startDate =
    get(["StartDate", "startDate", "Start", "StartDt", "Start_Date", "FromDate", "From"]) ?? "";
  const endDate =
    get(["EndDate", "endDate", "End", "EndDt", "End_Date", "ToDate", "To"]) ?? "";

  return {
    bid: Number(bid) || 0,
    batchName: String(batchName || ""),
    startDate,
    endDate,
  };
}

/* ===================== API helpers (use only final endpoints) ===================== */
// POST: insert / update (expects List<BatchesDto> at root)
async function postBatchArray(payloadArray, token) {
  const url = `${API_BASE_URL}/Programme/insertBatches`;
  const body = JSON.stringify(payloadArray);
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  logRequest("insertBatches", { url, method: "POST", headers, body });
  const res = await fetch(url, { method: "POST", headers, body });
  const { text, json } = await logResponse("insertBatches", res);
  if (!res.ok) throw new Error(text || (json && (json.title || json.message)) || `HTTP ${res.status}`);
  return json ?? text;
}

// GET: list all
async function getAllBatches(token) {
  const url = `${API_BASE_URL}/Programme/GetAllBatch`;
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  logRequest("GetAllBatch", { url, method: "GET", headers });
  const res = await fetch(url, { headers });
  const { text, json } = await logResponse("GetAllBatch", res);
  if (!res.ok) throw new Error(text || (json && (json.title || json.message)) || `HTTP ${res.status}`);

  let data;
  try {
    data = json ?? (text ? JSON.parse(text) : []);
  } catch {
    data = [];
  }

  if (!Array.isArray(data)) {
    // Some APIs wrap results like { data: [...] }
    const wrapper = (data && (data.data || data.result || data.items)) || [];
    if (!Array.isArray(wrapper)) throw new Error("GetAllBatch did not return an array");
    return wrapper;
  }
  return data;
}

// GET: by id (helper, optional)
async function getBatchById(bid, token) {
  const url = `${API_BASE_URL}/Programme/GetBatchById?Bid=${bid}`;
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  logRequest("GetBatchById", { url, method: "GET", headers });
  const res = await fetch(url, { headers });
  const { text, json } = await logResponse("GetBatchById", res);
  if (!res.ok) throw new Error(text || (json && (json.title || json.message)) || `HTTP ${res.status}`);
  return json ?? (text ? JSON.parse(text) : {});
}

// DELETE: by id (tries DELETE, falls back to GET on the same URL if server uses GET)
async function deleteBatchById(bid, token) {
  const url = `${API_BASE_URL}/Programme/DeleteBatchById?Bid=${bid}`;
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  logRequest("DeleteBatchById(DELETE)", { url, method: "DELETE", headers });
  let res = await fetch(url, { method: "DELETE", headers });
  let out = await logResponse("DeleteBatchById(DELETE)", res);

  if (!res.ok) {
    logRequest("DeleteBatchById(GET fallback)", { url, method: "GET", headers });
    res = await fetch(url, { method: "GET", headers });
    out = await logResponse("DeleteBatchById(GET fallback)", res);
    if (!res.ok) throw new Error(out.text || (out.json && (out.json.title || out.json.message)) || `HTTP ${res.status}`);
  }
  return out.json ?? out.text;
}

/* ===================== Component ===================== */
const BatchTab = () => {
  const [form, setForm] = useState({
    batchName: "",
    startDate: "",
    endDate: "",
    bid: 0, // 0 = create, >0 = update (same POST endpoint)
  });
  const [saving, setSaving] = useState(false);

  const [batches, setBatches] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");

  const isEditMode = Number(form.bid) > 0;

  useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshList() {
    setLoadingList(true);
    setListError("");
    try {
      const token = localStorage.getItem("jwt");
      const rows = await getAllBatches(token);

      // Normalize all shapes (objects/arrays)
      const normalized = rows.map(normalizeBatchDto).map((r, i) => {
        if (DEBUG && (!r.batchName || r.batchName === "")) {
          console.warn("⚠️ Row missing batchName, raw:", rows[i], "normalized:", r);
        }
        return r;
      });

      if (DEBUG) console.log("✅ Normalized batches:", normalized);
      setBatches(normalized);
    } catch (err) {
      setListError(err.message || "Failed to load batches.");
      if (DEBUG) console.error("❌ getAllBatches:", err);
    } finally {
      setLoadingList(false);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (DEBUG) console.log(`✏️ handleChange ${name}=`, value);
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleEdit = (row) => {
    setForm({
      batchName: row.batchName,
      startDate: toInputDate(row.startDate),
      endDate: toInputDate(row.endDate),
      bid: Number(row.bid) || 0,
    });
    toast.info("✏️ Edit mode");
  };

  const handleCancelEdit = () => {
    setForm({ batchName: "", startDate: "", endDate: "", bid: 0 });
    toast.dismiss();
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete batch "${row.batchName || "(no name)"}" (Bid=${row.bid})?`)) return;
    try {
      const token = localStorage.getItem("jwt");
      await deleteBatchById(row.bid, token);
      toast.success("🗑️ Deleted");
      await refreshList();
      if (isEditMode && Number(form.bid) === Number(row.bid)) handleCancelEdit();
    } catch (err) {
      console.error("❌ Delete failed:", err);
      toast.error(`❌ Delete failed: ${err.message}`);
    }
  };

  const handleSave = async () => {
    const { batchName, startDate, endDate, bid } = form;

    if (DEBUG) console.log("🧾 handleSave form:", form);

    if (!batchName || !startDate || !endDate) {
      toast.error("Please fill Batch, Start Date, and End Date");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start Date cannot be after End Date");
      return;
    }

    const dto = {
      Bid: Number(bid) || 0,
      BatchName: batchName,
      StartDate: toIsoMidnight(startDate),
      EndDate: toIsoMidnight(endDate),
    };

    try {
      setSaving(true);
      const token = localStorage.getItem("jwt");
      await postBatchArray([dto], token);
      toast.success(isEditMode ? "✅ Batch updated successfully" : "✅ Batch created successfully");
      await refreshList();
      setForm({ batchName: "", startDate: "", endDate: "", bid: 0 }); // back to insert mode
    } catch (err) {
      console.error("❌ Save failed:", err);
      toast.error(`❌ Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-0 pt-0 welcome-card animate-welcome">
  {/* Form Card */}
  <div className="mb-0 bg-glass p-3 rounded">
    <h5 className="mb-3 text-primary">Add / Edit Batch</h5>
    <Form onSubmit={(e) => e.preventDefault()}>
      <div className="row gy-3">
        <div className="col-md-6">
          <Form.Group>
            <Form.Label>Batch</Form.Label>
            <Form.Control
              name="batchName"
              placeholder="e.g., August 2025 - Evening"
              value={form.batchName}
              onChange={handleChange}
            />
          </Form.Group>
        </div>

        <div className="col-md-6">
          <Form.Group>
            <Form.Label>Start Date</Form.Label>
            <Form.Control
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
            />
          </Form.Group>
        </div>

        <div className="col-md-6">
          <Form.Group>
            <Form.Label>End Date</Form.Label>
            <Form.Control
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
            />
          </Form.Group>
        </div>

        <div className="col-12 mt-2 d-flex gap-2 align-items-center">
          <Button
            variant={isEditMode ? "warning" : "success"}
            className="rounded-pill px-4"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? isEditMode
                ? "Updating..."
                : "Saving..."
              : isEditMode
              ? "Update"
              : "Save"}
          </Button>

          {isEditMode && (
            <Button
              variant="outline-secondary"
              className="rounded-pill px-4"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Form>
  </div>

  {/* List Card */}
  <div className="p-4 mt-3 rounded bg-white border shadow-sm">
    <div className="d-flex justify-content-between align-items-center mb-3">
      <h5 className="mb-0">📋 Batches</h5>
      <Button
        variant="outline-primary"
        size="sm"
        onClick={refreshList}
        disabled={loadingList}
      >
        {loadingList ? "Refreshing..." : "Refresh"}
      </Button>
    </div>

    {listError && (
      <Alert variant="warning" className="mb-3">
        Couldn’t load from server: {listError}
      </Alert>
    )}

    <div className="p-0 overflow-auto custom-scrollbar flex-grow-1">
      {loadingList ? (
        <div className="py-3 text-center">
          <Spinner animation="border" role="status" />
        </div>
      ) : batches.length === 0 ? (
        <p className="mb-0">No batches found.</p>
      ) : (
        <div className="batch-table-scroll">
          <Table
            bordered
            hover
            responsive
            size="sm"
            className="mb-0"
            table-stacked
          >
            <thead>
              <tr className="bg-light">
                <th style={{ width: 110 }}>Bid</th>
                <th style={{ width: 130 }}>Batch</th>
                <th style={{ width: 200 }}>Start Date</th>
                <th style={{ width: 200 }}>End Date</th>
                <th style={{ width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b, idx) => {
                const start = toInputDate(b.startDate);
                const end = toInputDate(b.endDate);
                return (
                  <tr key={b.bid || idx}>
                    <td data-label="Bid">{b.bid}</td>
                    <td data-label="Batch" className="text-start">
                      {b.batchName || <em>(no name)</em>}
                    </td>
                    <td data-label="Start Date">{start}</td>
                    <td data-label="End Date">{end}</td>
                    <td data-label="Actions" className="d-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline-info"
                        onClick={() => handleEdit(b)}
                        type="button"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDelete(b)}
                        type="button"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  </div>
</div>

  );
};

export default BatchTab;
