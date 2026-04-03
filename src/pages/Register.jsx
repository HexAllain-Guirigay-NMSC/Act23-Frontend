import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function Register() {
  const [form, setForm] = useState({
    fullname: "",
    username: "",
    email: "",
    password: "",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("fullname", form.fullname);
      formData.append("username", form.username);
      formData.append("email", form.email);
      formData.append("password", form.password);

      if (profileImage) {
        formData.append("profile_image", profileImage);
      }

      const res = await api.post("/api/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage(
        res.data.message ||
          "Registration successful. Please check your email to verify your account."
      );

      setForm({
        fullname: "",
        username: "",
        email: "",
        password: "",
      });
      setProfileImage(null);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="auth-kicker">Account Setup</div>
          <h1>Create your GIS account and start building your map records.</h1>
          <p>
            Register your account, upload a profile image, and verify your email
            so you can access the full routing and location management system.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature">
              <div className="auth-feature-icon">🧭</div>
              <div>
                <strong>Personal Workspace</strong>
                <span>
                  Manage your own assigned location entries with a cleaner
                  dashboard experience.
                </span>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">📨</div>
              <div>
                <strong>Email Verification</strong>
                <span>
                  New users are verified through email before they can fully log
                  in and use the system.
                </span>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">🖼️</div>
              <div>
                <strong>Profile Identity</strong>
                <span>
                  Upload an image and keep your personal account details ready
                  for your GIS profile menu.
                </span>
              </div>
            </div>
          </div>

          <div className="brand-footer">Smart Location Management • Modern GIS UI</div>
        </div>

        <div className="auth-card">
          <div className="auth-head">
            <h2>Create account</h2>
            <p className="auth-subtitle">
              Fill in your information to register a new GIS user account.
            </p>
          </div>

          {message && <div className="success-box">{message}</div>}
          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label className="field-label">Full Name</label>
              <input
                type="text"
                name="fullname"
                placeholder="Enter your full name"
                value={form.fullname}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="field-label">Username</label>
              <input
                type="text"
                name="username"
                placeholder="Choose a username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="field-label">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="field-label">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="field-label">Profile Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
              />
              <div className="auth-file-note">
                Optional. Supported image files only.
              </div>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Register Account"}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}