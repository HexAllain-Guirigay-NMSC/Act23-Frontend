import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

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

    if (!token) {
      setError("Reset token is missing.");
      return;
    }

    if (!form.newPassword || !form.confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/api/reset-password", {
        token,
        new_password: form.newPassword,
      });

      setMessage(res.data.message || "Password reset successful.");
      setForm({
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1400);
    } catch (err) {
      setError(err.response?.data?.message || "Reset password failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="auth-kicker">New Password</div>
          <h1>Set a fresh password for your GIS account.</h1>
          <p>
            Choose a new password below. Once saved successfully, you will be
            redirected back to the login page.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature">
              <div className="auth-feature-icon">🔑</div>
              <div>
                <strong>Password Update</strong>
                <span>
                  Create a new password to recover access to your account and
                  return to your GIS workspace.
                </span>
              </div>
            </div>
          </div>

          <div className="brand-footer">Protected Password Reset</div>
        </div>

        <div className="auth-card">
          <div className="auth-head">
            <h2>Reset password</h2>
            <p className="auth-subtitle">
              Enter and confirm your new password below.
            </p>
          </div>

          {message && <div className="success-box">{message}</div>}
          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label className="field-label">New Password</label>
              <input
                type="password"
                name="newPassword"
                placeholder="Enter new password"
                value={form.newPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="field-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm new password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Updating password..." : "Reset Password"}
            </button>
          </form>

          <p className="auth-footer">
            <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}