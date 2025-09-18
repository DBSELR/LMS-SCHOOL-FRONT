import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";

const AddProfessor = ({ professor, onSubmit, mode = null, availableCourses = [], onCancel }) => {
  const readOnly = mode === "view";
  const editMode = mode === "edit";

  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    department: "",
    bio: "",
    profilePictureUrl: "",
    officeLocation: "",
    officeHours: "",
    employeeStatus: "Active",
    role: "Instructor",
    socialMediaLinks: [],
    educationalBackground: "",
    researchInterests: "",
    teachingRating: "",
    assignedCourses: [],
  });

  useEffect(() => {
    if (professor) {
      setFormData({
        ...professor,
        username: professor.username || "",
        password: "",
        firstName: professor.fullName?.split(" ")[0] || "",
        lastName: professor.fullName?.split(" ").slice(1).join(" ") || "",
        socialMediaLinks: Array.isArray(professor.socialMediaLinks)
          ? professor.socialMediaLinks
          : professor.socialMediaLinks?.split(",").map((link) => link.trim()) || [],
        assignedCourses: professor.assignedCourses || [],
      });
    }
  }, [professor]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(`${API_BASE_URL}/Department`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setDepartments(data);
          console.log("✅ Departments fetched:", data);
        } else {
          console.warn("⚠️ Department API did not return an array:", data);
        }
      } catch (error) {
        console.error("❌ Error fetching departments:", error);
        toast.error("Failed to load departments");
      }
    };
    fetchDepartments();
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

  const handleCourseChange = (e) => {
    const selectedCourses = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, assignedCourses: selectedCourses }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, userId: professor?.userId };

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

      toast.error(`❌ ${errorMessage}`, {
        autoClose: 3000,
        toastId: "professor-submit-error",
      });
    }
  };

  // ---- NEW: helper to mark auto-generated fields ----
  const isAutoField = (name) => name === "username" || name === "password";

  // Updated render helper: auto fields are disabled + label shows (Auto-generated)
  const renderInput = (label, name, type = "text", extra = {}) => {
    const auto = isAutoField(name);
    const finalLabel = auto ? `${label} (Auto-generated)` : label;

    return (
      <div className="form-group col-md-6">
        <label htmlFor={name} className="form-label">{finalLabel}</label>
        <input
          type={type}
          id={name}
          name={name}
          className="form-control"
          value={Array.isArray(formData[name]) ? formData[name].join(", ") : formData[name]}
          onChange={handleInputChange}
          // Disabled if read-only OR auto-generated field
          disabled={readOnly || auto}
          placeholder={auto ? "Auto-generated" : extra.placeholder}
          autoComplete={name === "password" ? "new-password" : "off"}
          {...extra}
        />
        {auto && (
          <small className="text-muted d-block mt-1">
            This will be generated automatically when saving.
          </small>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="container-fluid">
      <h4 className="mb-3">
        {mode === "edit" ? "Edit Faculty" : mode === "view" ? "Faculty Details" : "Add New Faculty"}
      </h4>

      <div className="row">
        {/* NOTE: you currently hide these in edit mode. They will be disabled in add/view. */}
        {!editMode && renderInput("Username", "username")}
        {!editMode && renderInput("Password", "password", "password")}
        {renderInput("First Name", "firstName")}
        {renderInput("Last Name", "lastName")}
        {renderInput("Email", "email", "email")}
        {renderInput("Phone Number", "phoneNumber")}

        <div className="form-group col-md-6">
          <label htmlFor="department">Department</label>
          <select
            name="department"
            id="department"
            className="form-control"
            value={formData.department}
            onChange={handleInputChange}
            disabled={readOnly}
          >
            <option value="">-- Select Department --</option>
            {departments.map((dept) => (
              <option key={dept.code} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
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
            <option value="Instructor">Faculty</option>
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
