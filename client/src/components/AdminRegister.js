import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../utils/axios";
import "../styles/auth.css";

const AdminRegister = () => {
	const [formData, setFormData] = useState({
		username: "",
		password: "",
		confirmPassword: "",
		adminSecret: "",
	});
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const { username, password, confirmPassword, adminSecret } = formData;

	const onChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const onSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		setLoading(true);

		// Check if passwords match
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			setLoading(false);
			return;
		}

		try {
			const res = await axios.post("/api/auth/create-admin", {
				username,
				password,
				adminSecret,
			});

			setSuccess("Admin account created successfully! Redirecting to login...");

			// Redirect to login after 3 seconds
			setTimeout(() => {
				navigate("/login");
			}, 3000);
		} catch (err) {
			console.error("Admin registration error:", err);
			setError(
				err.response?.data?.message || "Registration failed. Please try again."
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="register-container">
			<div className="register-form">
				<div className="logo-container">
					<div className="logo">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							width="48"
							height="48"
						>
							<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v5.7c0 4.83-3.4 9.19-7 10.36-3.6-1.17-7-5.53-7-10.36V6.3l7-3.12zm-1 8.32v4h2v-4h-2zm0-6v2h2V5.5h-2z" />
						</svg>
					</div>
				</div>
				<h2>Admin Registration</h2>
				<p className="subtitle">Create an administrator account</p>

				{error && <div className="alert alert-danger">{error}</div>}
				{success && <div className="alert alert-success">{success}</div>}

				<form onSubmit={onSubmit}>
					<div className="form-group">
						<label htmlFor="username">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								width="16"
								height="16"
								className="input-icon"
							>
								<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
							</svg>
							Username
						</label>
						<input
							type="text"
							id="username"
							name="username"
							value={username}
							onChange={onChange}
							placeholder="Choose an admin username"
							required
						/>
					</div>
					<div className="form-group">
						<label htmlFor="password">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								width="16"
								height="16"
								className="input-icon"
							>
								<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
							</svg>
							Password
						</label>
						<input
							type="password"
							id="password"
							name="password"
							value={password}
							onChange={onChange}
							placeholder="Create a strong password"
							required
						/>
					</div>
					<div className="form-group">
						<label htmlFor="confirmPassword">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								width="16"
								height="16"
								className="input-icon"
							>
								<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
							</svg>
							Confirm Password
						</label>
						<input
							type="password"
							id="confirmPassword"
							name="confirmPassword"
							value={confirmPassword}
							onChange={onChange}
							placeholder="Confirm your password"
							required
						/>
					</div>
					<div className="form-group">
						<label htmlFor="adminSecret">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								width="16"
								height="16"
								className="input-icon"
							>
								<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
							</svg>
							Admin Secret
						</label>
						<input
							type="password"
							id="adminSecret"
							name="adminSecret"
							value={adminSecret}
							onChange={onChange}
							placeholder="Enter the admin secret key"
							required
						/>
						<small className="form-text">
							This is the secret key set in your server's environment variables.
						</small>
					</div>
					<button type="submit" className="btn btn-primary" disabled={loading}>
						{loading ? (
							<>
								<span className="spinner"></span>
								Creating Admin Account...
							</>
						) : (
							"Register Admin"
						)}
					</button>
				</form>

				<div className="auth-footer">
					<p className="mt-3">
						<Link to="/login">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								width="16"
								height="16"
								className="input-icon"
							>
								<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
							</svg>
							Back to Login
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default AdminRegister;
