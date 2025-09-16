import React, { useEffect, useState } from "react";
import API_BASE_URL from "../../config";

const AddStudent = ({
  student,
  onSubmit,
  editMode = false,
  readOnly = false,
}) => {
  const [programmeOptions, setProgrammeOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [batchList, setBatchList] = useState([]);
  const [filteredProgrammes, setFilteredProgrammes] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);

  const [formData, setFormData] = useState({
    password: "",
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    profilePhotoUrl: "",
    batch: "",
    programmeId: "",
    groupId: "",
    semester: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    console.log("📥 Fetching Programmes and Groups...");

    fetch(`${API_BASE_URL}/Programme/All`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("✅ Programmes fetched:", data);
        setProgrammeOptions(data);
        const batches = [...new Set(data.map((p) => p.batchName))];
        console.log("📦 Unique Batches:", batches);
        setBatchList(batches);
      })
      .catch((err) => console.error("❌ Error fetching programmes:", err));

    fetch(`${API_BASE_URL}/Group/All`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("✅ Groups fetched:", data);
        setGroupOptions(data);
      })
      .catch((err) => console.error("❌ Error fetching groups:", err));
  }, []);

  useEffect(() => {
    if (student && programmeOptions.length && groupOptions.length) {
      console.log("🛠️ Populating form data for edit/view mode...");
      const matchedProgramme = programmeOptions.find(
        (p) => p.programmeName === student.programme || p.programmeId === student.programmeId
      );
      const matchedGroup = groupOptions.find(
        (g) => g.groupName === student.group || g.groupId === student.groupId
      );

      const dob = student.dateOfBirth?.split("T")[0] || "";

      console.log("🎯 Matched Programme:", matchedProgramme);
      console.log("🎯 Matched Group:", matchedGroup);

      setFormData((prev) => ({
        ...prev,
        ...student,
        programmeId: matchedProgramme?.programmeId?.toString() || "",
        groupId: matchedGroup?.groupId?.toString() || "",
        batch: matchedProgramme?.batchName || student.batch || "",
        dateOfBirth: dob,
        password: "",
      }));
    }
  }, [student, programmeOptions, groupOptions]);

  useEffect(() => {
    console.log("📍 Updating dependent dropdowns");
    console.log("🔎 Current formData:", formData);

    if (!formData.batch) {
      setFilteredProgrammes([]);
      setFilteredGroups([]);
      setSemesterOptions([]);
      console.log("❕ Batch not selected — reset filtered lists");
      return;
    }

    const filtered = programmeOptions.filter(
      (p) => p.batchName === formData.batch
    );
    console.log("🎯 Filtered Programmes for batch:", filtered);
    setFilteredProgrammes(filtered);

    const filteredGrp = groupOptions.filter(
      (g) =>
        g.batchName === formData.batch &&
        g.programmeId === parseInt(formData.programmeId)
    );
    console.log("🎯 Filtered Groups:", filteredGrp);
    setFilteredGroups(filteredGrp);

    const selectedProgramme = programmeOptions.find(
      (p) => p.programmeId === parseInt(formData.programmeId)
    );
    const semCount = selectedProgramme?.numberOfSemesters || 0;
    const sems = Array.from({ length: semCount }, (_, i) => i + 1);
    console.log("📘 Semesters for selected programme:", sems);
    setSemesterOptions(sems);
  }, [formData.batch, formData.programmeId, programmeOptions, groupOptions]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`✍️ Input change: ${name} = ${value}`);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("📤 Form submitted with data:", formData);

    const { password, username, courseId, ...validFormData } = formData;

    const programmeName =
      programmeOptions.find(
        (p) => p.programmeId === parseInt(formData.programmeId)
      )?.programmeName || "";

    if (
      !validFormData.email ||
      !validFormData.firstName ||
      !validFormData.programmeId ||
      !validFormData.semester ||
      !validFormData.batch
    ) {
      alert("Email, First Name, Batch, Programme, and Semester are required");
      console.warn("⚠️ Missing required fields");
      return;
    }

    const payload = {
      ...validFormData,
      semester: parseInt(formData.semester),
      programmeId: parseInt(formData.programmeId),
      groupId: parseInt(formData.groupId),
      programme: programmeName,
      dateOfBirth: formData.dateOfBirth
        ? new Date(formData.dateOfBirth).toISOString()
        : null,
    };

    console.log("✅ Final payload to be sent:", payload);
    if (onSubmit) onSubmit(payload);
  };

  const renderInput = (label, name, type = "text", extra = {}) => (
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
      <input
        type={type}
        id={name}
        name={name}
        className="form-control"
        value={formData[name] ?? ""}
        onChange={handleInputChange}
        disabled={readOnly || (name === "password" && editMode)}
        {...extra}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="student-form-grid">
        {renderInput("Username (Auto-generated)", "username", "text", {
          disabled: true,
        })}
        {!editMode &&
          renderInput("Password (Auto-generated)", "password", "text", {
            disabled: true,
            value: "Auto-generated",
          })}
        {renderInput("Email", "email", "email")}
        {renderInput("First Name", "firstName")}
        {renderInput("Last Name", "lastName")}
        {renderInput("Phone Number", "phoneNumber")}
        {renderInput("Date of Birth", "dateOfBirth", "date")}
        {renderInput("Gender", "gender")}
        {renderInput("Address", "address")}
        {renderInput("City", "city")}
        {renderInput("State", "state")}
        {renderInput("Country", "country")}
        {renderInput("Zip Code", "zipCode")}
        {renderInput("Profile Photo URL", "profilePhotoUrl")}

        {/* Batch */}
        <div className="form-group">
          <label>Batch</label>
          <select
            className="form-control"
            name="batch"
            value={formData.batch}
            onChange={handleInputChange}
            disabled={readOnly}
          >
            <option value="">-- Select Batch --</option>
            {batchList.map((b, i) => (
              <option key={i} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Programme */}
        <div className="form-group">
          <label>Programme</label>
          <select
            className="form-control"
            name="programmeId"
            value={formData.programmeId}
            onChange={handleInputChange}
            disabled={readOnly}
          >
            <option value="">-- Select Programme --</option>
            {filteredProgrammes.map((p) => (
              <option key={p.programmeId} value={p.programmeId}>
                {p.programmeName} ({p.programmeCode})
              </option>
            ))}
          </select>
        </div>

        {/* Group */}
        <div className="form-group">
          <label>Group</label>
          <select
            className="form-control"
            name="groupId"
            value={formData.groupId}
            onChange={handleInputChange}
            disabled={readOnly}
          >
            <option value="">-- Select Group --</option>
            {filteredGroups.map((g) => (
              <option key={g.groupId} value={g.groupId}>
                {g.groupCode} - {g.groupName}
              </option>
            ))}
          </select>
        </div>

        {/* Semester */}
        <div className="form-group">
          <label>Semester</label>
          <select
            className="form-control"
            name="semester"
            value={formData.semester}
            onChange={handleInputChange}
            disabled={readOnly}
          >
            <option value="">-- Select Semester --</option>
            {semesterOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!readOnly && (
        <div className="student-form-actions">
          <button type="submit" className="btn btn-primary">
            {editMode ? "Update" : "Add"} Student
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.history.back()}
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
};

export default AddStudent;
