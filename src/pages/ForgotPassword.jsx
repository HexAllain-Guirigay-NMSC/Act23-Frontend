import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/forgot-password", { email });
      setMessage(res.data.message || "Password reset link sent.");
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="auth-kicker">Account Recovery</div>
          <h1>Reset access to your GIS account.</h1>
          <p>
            Enter the email address linked to your account and the system will
            send you a secure password reset link.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature">
              <div className="auth-feature-icon">✉️</div>
              <div>
                <strong>Email Recovery</strong>
                <span>
                  Password reset links are sent to the registered email address
                  for your account.
                </span>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">🔒</div>
              <div>
                <strong>Secure Reset Flow</strong>
                <span>
                  Reset is completed through a token-based flow rather than
                  exposing your password directly.
                </span>
              </div>
            </div>
          </div>

          <div className="brand-footer">Secure GIS Access Recovery</div>
        </div>

        <div className="auth-card">
          <div className="auth-head">
            <h2>Forgot password</h2>
            <p className="auth-subtitle">
              Enter your email to receive a password reset link.
            </p>
          </div>

          {message && <div className="success-box">{message}</div>}
          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label className="field-label">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Sending link..." : "Send Reset Link"}
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