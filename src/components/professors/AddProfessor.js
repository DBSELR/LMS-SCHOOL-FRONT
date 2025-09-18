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
    username: "",            // hidden, not sent
    password: "",            // hidden, not sent
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    department: "",          // ← this is the only field the POST needs (formatted as (CODE)-NAME)
    bio: "",
    profilePictureUrl: "",
    officeLocation: "",
    officeHours: "",
    employeeStatus: "Active",
    role: "Faculty",         // align option value & default (adjust if your API expects 'Instructor')
    socialMediaLinks: [],
    educationalBackground: "",
    researchInterests: "",
    teachingRating: "",
    assignedCourses: [],
    // Local-only helpers for UX (NOT posted)
    programmeCode: "",
    programmeName: "",
  });

  // Try to parse "(CODE)-NAME" into { code, name }
  const parseDepartment = (dep) => {
    if (!dep || typeof dep !== "string") return { code: "", name: "" };
    const m = dep.match(/^\(([^)]+)\)-\s*(.+)$/);
    if (m) return { code: m[1]?.trim() || "", name: m[2]?.trim() || "" };
    return { code: "", name: "" };
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
        department: professor.department || "",
      };
      // derive local programmeCode/name from department string, if present
      const { code, name } = parseDepartment(next.department);
      next.programmeCode = code;
      next.programmeName = name;
      setFormData((prev) => ({ ...prev, ...next }));
    }
  }, [professor]);

  // Fetch Programmes (robust)
  useEffect(() => {
    const fetchProgrammes = async () => {
      const token = localStorage.getItem("jwt");

      const base = String(API_BASE_URL || "").replace(/\/+$/, "");
      const hasApi = /\/api$/i.test(base);
      const roots = hasApi ? [base] : [`${base}/api`, base];

      const paths = [
        "Programmes/All",
        "Programmes/GetAll",
        "Programmes",
        "Programme/All",
        "Programs/All",
        "Programs/GetAll",
        "Programs",
      ];

      const candidates = [];
      roots.forEach((r) => paths.forEach((p) => candidates.push(`${r}/${p}`)));

      console.groupCollapsed("📡 Programmes: trying candidate URLs");
      candidates.forEach((u, i) => console.log(`[${i + 1}] ${u}`));
      console.groupEnd();

      let success = null;
      let lastError = null;

      for (const url of candidates) {
        try {
          console.log("➡️ Trying:", url);
          const res = await fetch(url, {
            headers: {
              Accept: "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });

          const ct = res.headers.get("content-type") || "";
          console.log("   Status:", res.status, res.statusText, "| type:", ct);

          if (!res.ok) {
            const snippet = await res.text().catch(() => "");
            console.warn("   Non-OK body (first 300 chars):", snippet.slice(0, 300));
            lastError = new Error(`HTTP ${res.status} ${res.statusText}`);
            continue;
          }

          let raw;
          if (ct.includes("application/json")) {
            raw = await res.json();
          } else {
            const text = await res.text();
            if (!text) throw new Error("Empty body, expected JSON");
            try {
              raw = JSON.parse(text);
            } catch {
              console.warn("   Response was not JSON. First 300 chars:", text.slice(0, 300));
              throw new Error("Response is not valid JSON");
            }
          }

          console.log("✅ Success with:", url, "| raw length:", Array.isArray(raw) ? raw.length : "n/a");

          const normalized = Array.isArray(raw)
            ? raw.map((item) => {
                if (item && typeof item === "object") {
                  return {
                    code:
                      item.ProgrammeCode ??
                      item.programmeCode ??
                      item.ProgramCode ??
                      item.programCode ??
                      item.CODE ??
                      item.code ??
                      "",
                    name:
                      item.ProgrammeName ??
                      item.programmeName ??
                      item.ProgramName ??
                      item.programmeName ??
                      item.NAME ??
                      item.name ??
                      "",
                  };
                }
                if (Array.isArray(item)) return { code: item[0] ?? "", name: item[1] ?? "" };
                return { code: "", name: "" };
              })
            : [];

          const filtered = normalized.filter((p) => p.code && p.name);
          setProgrammes(filtered);
          if (!filtered.length) console.warn("⚠️ No usable Programmes found from response.");

          success = url;
          break;
        } catch (err) {
          console.error("   ❌ Candidate failed:", url, "|", err?.message || err);
          lastError = err;
        }
      }

      if (success) {
        console.log("🎯 Programmes loaded from:", success);
      } else {
        console.error("🚨 All candidates failed for Programmes.");
        console.info("👉 Verify the exact backend route in your controller (and Swagger).");
        setProgError(lastError?.message || "Failed to load programmes");
        toast.error("Failed to load programmes");
      }
    };

    setProgLoading(true);
    setProgError(null);
    fetchProgrammes().finally(() => setProgLoading(false));
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

  // When programme changes, update local code/name and the POST field `department`
  const handleProgrammeChange = (e) => {
    const code = e.target.value;
    const match = programmes.find((p) => String(p.code) === String(code));
    const name = match?.name || "";
    const departmentFormatted = code && name ? `(${code})-${name}` : "";

    setFormData((prev) => ({
      ...prev,
      programmeCode: code,      // local only (not posted)
      programmeName: name,      // local only (not posted)
      department: departmentFormatted, // ← actual field your API needs
    }));

    console.log("➡️ Selected Programme -> department:", departmentFormatted);
  };

  const handleCourseChange = (e) => {
    const selectedCourses = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, assignedCourses: selectedCourses }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build payload: omit username/password/local programme fields
    // Keep ONLY department (formatted as (CODE)-NAME) for the board selection
    const {
      username,
      password,
      programmeCode,
      programmeName,
      ...rest
    } = formData;

    const payload = { ...rest, userId: professor?.userId };

    console.log("📦 Submitting Faculty payload:", payload);

    try {
      if (onSubmit) {
        await onSubmit(payload);
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
          {formData.department && (
            <small className="text-muted d-block mt-1">
              Selected (will post as department): {formData.department}
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
            <option value="Faculty">Faculty</option>
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
