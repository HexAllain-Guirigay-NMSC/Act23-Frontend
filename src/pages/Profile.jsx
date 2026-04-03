import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { API_BASE_URL } from "../services/api";

export default function Profile() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [form, setForm] = useState({
    fullname: "",
    username: "",
    email: "",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [currentImage, setCurrentImage] = useState("");
  const [notification, setNotification] = useState({
    open: false,
    type: "",
    text: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!notification.open) return;

    const timer = setTimeout(() => {
      setNotification({ open: false, type: "", text: "" });
    }, 3000);

    return () => clearTimeout(timer);
  }, [notification]);

  const showNotification = (type, text) => {
    setNotification({
      open: true,
      type,
      text,
    });
  };

  const fetchProfile = async () => {
    setLoading(true);

    try {
      const res = await api.get("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setForm({
        fullname: res.data.fullname || "",
        username: res.data.username || "",
        email: res.data.email || "",
      });

      setCurrentImage(res.data.profile_image || "");

      const savedUser = localStorage.getItem("user");
      const parsedUser = savedUser ? JSON.parse(savedUser) : {};

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...parsedUser,
          fullname: res.data.fullname || "",
          username: res.data.username || "",
          email: res.data.email || "",
          profile_image: res.data.profile_image || "",
          user_id: res.data.user_id,
          is_verified: res.data.is_verified,
        })
      );
    } catch (err) {
      showNotification("error", err.response?.data?.message || "Failed to load profile.");

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const getImageSrc = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${API_BASE_URL}/${path}`;
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("_method", "PUT");

      if (form.fullname?.trim()) {
        formData.append("fullname", form.fullname.trim());
      }

      if (form.username?.trim()) {
        formData.append("username", form.username.trim());
      }

      if (form.email?.trim()) {
        formData.append("email", form.email.trim());
      }

      if (profileImage) {
        formData.append("profile_image", profileImage);
      }

      const res = await api.post("/api/profile", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      showNotification("success", res.data.message || "Profile updated successfully.");
      setProfileImage(null);
      await fetchProfile();
    } catch (err) {
      showNotification("error", err.response?.data?.message || "Failed to update profile.");

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post(
        "/api/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="page-card location-page profile-page">
          <div className="info-box">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      {notification.open && (
        <div className={`floating-notification ${notification.type}`}>
          <span>{notification.text}</span>
          <button
            type="button"
            className="floating-notification-close"
            onClick={() => setNotification({ open: false, type: "", text: "" })}
          >
            ×
          </button>
        </div>
      )}

      <div className="page-card location-page profile-page">
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-kicker">User Profile</div>
            <div className="page-title-row">
              <h2>My Account</h2>
            </div>
            <div className="page-summary">
              Update your personal information, email, username, and profile
              image used throughout the GIS system.
            </div>
          </div>
        </div>

        <div className="profile-layout">
          <div className="profile-side-card">
            <div className="profile-image-wrap">
              {currentImage ? (
                <img
                  src={getImageSrc(currentImage)}
                  alt="Profile"
                  className="profile-preview"
                />
              ) : (
                <div className="profile-placeholder">
                  {(form.fullname || form.username || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="profile-name">{form.fullname || "User Profile"}</div>
            <div className="profile-email">{form.email || "No email available"}</div>

            <div className="profile-meta-list">
              <div className="profile-meta-item">
                <span>Username</span>
                <strong>{form.username || "-"}</strong>
              </div>

              <div className="profile-meta-item">
                <span>Verification Status</span>
                <strong>{storedUser?.is_verified ? "Verified" : "Pending"}</strong>
              </div>

              <div className="profile-meta-item">
                <span>System Role</span>
                <strong>GIS User</strong>
              </div>
            </div>

            <div className="profile-links">
              <Link to="/locations" className="outline-btn">
                Back to Locations
              </Link>
              <button type="button" className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>

          <div className="profile-panel">
            <div className="profile-panel-head">
              <h3>Edit profile information</h3>
              <p>
                Make changes to your visible account details. The updated data
                will also refresh the profile information stored locally after
                save.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="profile-form-grid">
                <div className="field-group full-span">
                  <label className="field-label">Full Name</label>
                  <input
                    type="text"
                    name="fullname"
                    placeholder="Enter full name"
                    value={form.fullname}
                    onChange={handleChange}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Username</label>
                  <input
                    type="text"
                    name="username"
                    placeholder="Enter username"
                    value={form.username}
                    onChange={handleChange}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter email address"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="field-group full-span">
                  <label className="field-label">Profile Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="profile-actions">
                <button type="submit" disabled={saving}>
                  {saving ? "Saving changes..." : "Update Profile"}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setProfileImage(null);
                    fetchProfile();
                  }}
                >
                  Reset Form
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}