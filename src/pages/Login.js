import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
 import API_BASE_URL from "../config";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/Login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: form.email, password: form.password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(errorText);
        return;
      }

      const data = await response.json();

      if (data.token) {
        localStorage.setItem("jwt", data.token);
        window.dispatchEvent(new Event("storage"));
        const decodedToken = jwtDecode(data.token);
        const role =
          decodedToken[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ];

        switch (role) {
          case "Admin":
            navigate("/admin-dashboard");
            break;
          case "Faculty":
            navigate("/instructor-dashboard");
            break;
            case "SRO":
            navigate("/sro-dashboard");
            break;
          case "Student":
            navigate("/student-dashboard");
            break;
          case "Parent":
            navigate("/parent-dashboard");
            break;
          case "Accountant":
            navigate("/accountant-dashboard");
            break;
          case "Director":
            navigate("/director-dashboard");
            break;
          default:
            alert("Unknown role");
        }
      } else {
        alert("Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed, please try again.");
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center vh-100"
      style={{ background: "#e4e9f0" }}
    >
      <div
        className="card shadow-lg border-0"
        style={{ maxWidth: "400px", width: "100%", borderRadius: "12px" }}
      >
        <div className="card-body p-4">
          <div className="text-center mb-4">
            {/* <i className="fa fa-university fa-2x text-primary mb-2"></i> */}
            <img src="./assets/EdVedha-Logo.png" />
            {/* <h5 className="mb-3 font-weight-bold">Welcome Back</h5> */}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-3">
              <label htmlFor="email" className="font-weight-semibold">
                Username
              </label>
              <input
                type="text"
                className="form-control rounded-pill border-0 shadow-sm"
                id="email"
                name="email"
                placeholder="Enter your username"
                value={form.email}
                onChange={handleChange}
                required
                style={{ backgroundColor: "#f9f9f9" }}
              />
            </div>

            <div className="form-group mb-4">
              <label htmlFor="password" className="font-weight-semibold">
                Password
              </label>
              <input
                type="password"
                className="form-control rounded-pill border-0 shadow-sm"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                style={{ backgroundColor: "#f9f9f9" }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block rounded-pill py-2"
            >
              Sign In
            </button>
          </form>

          {/* <div className="text-center mt-4">
            <span className="text-muted">Don't have an account?</span> <a href="/register" className="text-primary font-weight-bold">Create one</a>
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default Login;
