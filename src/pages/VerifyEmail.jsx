import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Verifying your email...");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    const verifyAccount = async () => {
      try {
        const token = searchParams.get("token");

        if (!token) {
          setError("Verification token is missing.");
          setLoading(false);
          return;
        }

        const res = await api.get(`/api/verify-email?token=${token}`);
        setMessage(res.data.message || "Email verified successfully.");
      } catch (err) {
        setError(err.response?.data?.message || "Email verification failed.");
      } finally {
        setLoading(false);
      }
    };

    verifyAccount();
  }, [searchParams]);

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="auth-kicker">Email Verification</div>
          <h1>Confirm your account access.</h1>
          <p>
            The system is checking your verification token so your account can
            be activated and ready for secure login.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature">
              <div className="auth-feature-icon">✅</div>
              <div>
                <strong>Account Activation</strong>
                <span>
                  Verified users can access the GIS dashboard and start using
                  route and location management tools.
                </span>
              </div>
            </div>
          </div>

          <div className="brand-footer">Verification Gateway</div>
        </div>

        <div className="auth-card">
          <div className="auth-head">
            <h2>Verify email</h2>
            <p className="auth-subtitle">Account verification status</p>
          </div>

          <div className="verify-state">
            {loading && (
              <>
                <div className="verify-icon success">…</div>
                <div className="info-box">Verifying your email...</div>
              </>
            )}

            {!loading && !error && (
              <>
                <div className="verify-icon success">✓</div>
                <div className="success-box">{message}</div>
              </>
            )}

            {!loading && error && (
              <>
                <div className="verify-icon error">!</div>
                <div className="error-box">{error}</div>
              </>
            )}
          </div>

          <p className="auth-footer">
            <Link to="/login">Go to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}