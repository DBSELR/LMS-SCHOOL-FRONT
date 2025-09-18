import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";

const AddProfessor = ({ professor, onSubmit, mode = null, availableCourses = [], onCancel }) => {
  const readOnly = mode === "view";
  const editMode = mode === "edit";

  // Programmes state (for dropdown)
  const [programmes, setProgrammes] = useState([]);
  const [progLoading, setProgLoading] = useState(false);
  const [progError, setProgError] = useState(null);

  const [formData, setFormData] = useState({
    username: "",            // hidden
    password: "",            // hidden
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    department: "",          // CODE only (e.g., "CBSE")
    bio: "",
    profilePictureUrl: "",
    officeLocation: "",
    officeHours: "",
    employeeStatus: "Active",
    role: "Instructor",
    socialMediaLinks: [],
    educationalBackground: "",
    researchInterests: "",
    teachingRating: "",      // string; coerced on submit
    assignedCourses: [],
    // local-only helpers (NOT posted)
    programmeCode: "",
    programmeName: "",
  });

  // Parse department from existing value: supports "(CODE)-NAME" or plain "CODE"
  const parseDepartment = (dep) => {
    if (!dep || typeof dep !== "string") return { code: "", name: "" };
    const trimmed = dep.trim();
    const mParen = trimmed.match(/^\(([^)]+)\)\s*-\s*(.+)$/);
    if (mParen) return { code: mParen[1].trim(), name: mParen[2].trim() };
    if (trimmed.startsWith("(") && trimmed.includes(")")) {
      const inner = trimmed.slice(1, trimmed.indexOf(")")).trim();
      return { code: inner, name: "" };
    }
    const hyphenIdx = trimmed.indexOf("-");
    if (hyphenIdx > -1) return { code: trimmed.slice(0, hyphenIdx).trim(), name: trimmed.slice(hyphenIdx + 1).trim() };
    return { code: trimmed, name: "" };
  };

  // Prefill from professor
  useEffect(() => {
    if (professor) {
      const next = {
        ...professor,
        username: professor.username || "",
        password: "",
        firstName: professor.fullName?.split(" ")[0] || professor.firstName || "",
        lastName: professor.fullName?.split(" ").slice(1).join(" ") || professor.lastName || "",
        socialMediaLinks: Array.isArray(professor.socialMediaLinks)
          ? professor.socialMediaLinks
          : professor.socialMediaLinks?.split(",").map((link) => link.trim()) || [],
        assignedCourses: professor.assignedCourses || [],
        department: (professor.department || "").trim(), // may be CODE or (CODE)-NAME
        teachingRating: professor.teachingRating?.toString?.() ?? "",
      };
      const { code, name } = parseDepartment(next.department);
      next.programmeCode = code;       // dropdown value
      next.department = code || "";    // keep only CODE
      next.programmeName = name || "";
      setFormData((prev) => ({ ...prev, ...next }));
    }
  }, [professor]);

  // Fetch Programmes — locked to /api/Programme/All
  useEffect(() => {
    const fetchProgrammes = async () => {
      const token = localStorage.getItem("jwt");
      const base = String(API_BASE_URL || "").replace(/\/+$/, "");
      const url = /\/api$/i.test(base) ? `${base}/Programme/All` : `${base}/api/Programme/All`;

      try {
        setProgLoading(true);
        setProgError(null);
        console.log("📡 Fetching Programmes (locked route):", url);

        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const snippet = await res.text().catch(() => "");
          console.warn("   Non-OK body (first 300 chars):", snippet.slice(0, 300));
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const ct = res.headers.get("content-type") || "";
        const raw = ct.includes("application/json") ? await res.json() : JSON.parse(await res.text());

        const normalized = Array.isArray(raw)
          ? raw.map((item) => ({
              code:
                item?.ProgrammeCode ??
                item?.programmeCode ??
                item?.ProgramCode ??
                item?.programCode ??
                item?.CODE ??
                item?.code ??
                "",
              name:
                item?.ProgrammeName ??
                item?.programmeName ??
                item?.ProgramName ??
                item?.programName ??
                item?.NAME ??
                item?.name ??
                "",
            }))
          : [];

        const filtered = normalized.filter((p) => p.code && p.name);
        setProgrammes(filtered);
        console.log(`✅ Programmes loaded: ${filtered.length}`);
      } catch (err) {
        console.error("❌ Error fetching programmes:", err);
        setProgError(err?.message || "Failed to load programmes");
        toast.error("Failed to load programmes");
      } finally {
        setProgLoading(false);
      }
    };

    fetchProgrammes();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "phoneNumber") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
    } else if (name === "socialMediaLinks") {
      setFormData((prev) => ({ ...prev, [name]: value.split(",").map((link) => link.trim()) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Programme change → store CODE only in department
  const handleProgrammeChange = (e) => {
    const code = e.target.value;
    const match = programmes.find((p) => String(p.code) === String(code));
    const name = match?.name || "";

    setFormData((prev) => ({
      ...prev,
      programmeCode: code,     // UI
      programmeName: name,     // UI
      department: code || "",  // POST only CODE
    }));

    console.log("➡️ Selected Programme -> department (CODE only):", code || "");
  };

  const handleCourseChange = (e) => {
    const selectedCourses = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, assignedCourses: selectedCourses }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.department) {
      toast.error("Please select a Board (Programme) before saving.");
      console.warn("⛔ Blocked submit: department (code) is empty.");
      return;
    }

    // Build payload (coerce types)
    const {
      username,         // not used by server, but…
      password,         // …server validation still requires them
      programmeCode,
      programmeName,
      teachingRating,
      ...rest
    } = formData;

    // ✅ Add placeholders to satisfy [Required] in InstructorRegisterRequest
    const finalPayload = {
      ...rest,
      username: "TEMPUSER",          // placeholder; server will overwrite
      password: "TempP@ssw0rd!",     // placeholder; server will overwrite
      teachingRating:
        teachingRating === "" || teachingRating === null || teachingRating === undefined
          ? null
          : Number(teachingRating),
      userId: professor?.userId, // undefined is fine on create
    };

    try {
      console.group("📦 Submitting Faculty payload");
      console.table(finalPayload);
      console.log("JSON:", JSON.stringify(finalPayload));
      console.groupEnd();
    } catch {
      console.log("📦 Submitting Faculty payload (fallback log):", finalPayload);
    }

    try {
      if (onSubmit) {
        await onSubmit(finalPayload);
        toast.success(`✅ Faculty ${editMode ? "updated" : "added"} successfully`, {
          autoClose: 3000,
          toastId: "professor-submit-toast",
        });
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Save failed";
      console.error("🚨 Submit error:", errorMessage);
      toast.error(`❌ ${errorMessage}`, {
        autoClose: 3000,
        toastId: "professor-submit-error",
      });
    }
  };

  const renderInput = (label, name, type = "text", extra = {}) => (
    <div className="form-group col-md-6">
      <label htmlFor={name} className="form-label">{label}</label>
      <input
        type={type}
        id={name}
        name={name}
        className="form-control"
        value={Array.isArray(formData[name]) ? formData[name].join(", ") : formData[name]}
        onChange={handleInputChange}
        disabled={readOnly}
        {...extra}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="container-fluid">
      <h4 className="mb-3">
        {mode === "edit" ? "Edit Faculty" : mode === "view" ? "Faculty Details" : "Add New Faculty"}
      </h4>

      <div className="row">
        {/* Username & Password fields are intentionally NOT rendered */}
        {renderInput("First Name", "firstName")}
        {renderInput("Last Name", "lastName")}
        {renderInput("Email", "email", "email")}
        {renderInput("Phone Number", "phoneNumber")}

        {/* Board / Programme dropdown */}
        <div className="form-group col-md-6">
          <label htmlFor="programme">Board</label>
          <select
            id="programme"
            name="programmeCode"
            className="form-control"
            value={formData.programmeCode}
            onChange={handleProgrammeChange}
            disabled={readOnly || progLoading}
          >
            <option value="">{progLoading ? "Loading Boards..." : "-- Select Board --"}</option>
            {programmes.map((p) => (
              <option key={p.code} value={p.code}>
                ({p.code})-{p.name}
              </option>
            ))}
          </select>
          {progError && (
            <small className="text-danger d-block mt-1">
              Couldn’t load Boards: {progError}
            </small>
          )}
          {formData.programmeCode && (
            <small className="text-muted d-block mt-1">
              Selected: ({formData.programmeCode})-{formData.programmeName || "—"}
              {" • Sent as department: "}
              <strong>{formData.department}</strong>
            </small>
          )}
        </div>

        {renderInput("Profile Picture URL", "profilePictureUrl")}
        {renderInput("Office Location", "officeLocation")}
        {renderInput("Office Hours", "officeHours")}
        {renderInput("Bio", "bio")}
        {renderInput("Social Media Links", "socialMediaLinks", "text", { placeholder: "Comma separated" })}
        {renderInput("Educational Background", "educationalBackground")}
        {renderInput("Research Interests", "researchInterests")}
        {renderInput("Teaching Rating", "teachingRating", "number", { min: 1, max: 5, step: 0.1 })}
      </div>

      <div className="row">
        <div className="form-group col-md-6">
          <label htmlFor="employeeStatus">Status</label>
          <select
            name="employeeStatus"
            id="employeeStatus"
            className="form-control"
            value={formData.employeeStatus}
            onChange={handleInputChange}
            disabled={readOnly}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
          </select>
        </div>

        <div className="form-group col-md-6">
          <label htmlFor="role">Role</label>
          <select
            name="role"
            id="role"
            className="form-control"
            value={formData.role}
            onChange={handleInputChange}
            disabled={readOnly}
          >
            <option value="Instructor">Instructor</option>
          </select>
        </div>
      </div>

      <div className="d-flex gap-2 mt-3">
        {!readOnly && (
          <button type="submit" className="btn btn-primary">
            {mode === "edit" ? "Update" : "Add"} Faculty
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {readOnly ? "Close" : "Cancel"}
        </button>
      </div>
    </form>
  );
};

export default AddProfessor;
