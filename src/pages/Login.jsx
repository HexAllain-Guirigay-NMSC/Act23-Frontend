import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
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
    setLoading(true);

    try {
      const res = await api.post("/api/login", form);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      setMessage(res.data.message || "Login successful.");

      setTimeout(() => {
        navigate("/locations");
      }, 700);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="auth-kicker">GIS Platform</div>
          <h1>Map, route, and manage locations in one workspace.</h1>
          <p>
            Access your GIS dashboard to plan routes, manage saved locations,
            and maintain location records in a cleaner and more professional
            mapping interface.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature">
              <div className="auth-feature-icon">🗺️</div>
              <div>
                <strong>Route Planning</strong>
                <span>
                  Search places, calculate routes, and view turn-by-turn
                  directions using your integrated mapping page.
                </span>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">📍</div>
              <div>
                <strong>Location Records</strong>
                <span>
                  Save, edit, and organize place information with coordinates,
                  descriptions, images, and assigned entity details.
                </span>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">🔐</div>
              <div>
                <strong>Secure Access</strong>
                <span>
                  Protected login, email verification, password reset, and
                  account profile management are all built in.
                </span>
              </div>
            </div>
          </div>

          <div className="brand-footer">Spatial Operations • Location Intelligence • Web GIS</div>
        </div>

        <div className="auth-card">
          <div className="auth-head">
            <h2>Welcome back</h2>
            <p className="auth-subtitle">
              Sign in to continue to your GIS dashboard.
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
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login to GIS"}
            </button>
          </form>

          <div className="auth-mini-links">
            <span>
              No account yet? <Link to="/register">Create one</Link>
            </span>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}