import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

const Register = () => {
	const [formData, setFormData] = useState({
		username: "",
		password: "",
		confirmPassword: "",
		email: "",
		fullName: "",
	});
	const [error, setError] = useState("");
	const [warning, setWarning] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const { register } = useAuth();

	const { username, password, confirmPassword, email, fullName } = formData;

	const onChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const onSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setWarning("");
		setLoading(true);

		// Check if passwords match
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			setLoading(false);
			return;
		}

		try {
			console.log("Submitting registration form...");
			const result = await register({
				username,
				password,
				email,
				fullName,
			});

			console.log("Registration result:", result);

			if (result.success) {
				if (result.warning) {
					// If there's a warning, show it and redirect to login
					setWarning(result.warning);
					setTimeout(() => {
						navigate("/login");
					}, 3000);
				} else {
					// Otherwise redirect to dashboard
					navigate("/dashboard");
				}
			} else {
				setError(result.error || "Registration failed. Please try again.");
			}
		} catch (err) {
			console.error("Registration error:", err);
			setError("Registration failed. Please try again.");
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
							<path d="M21 13V7a1 1 0 0 0-1-1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v2H4a1 1 0 0 0-1 1v6a3 3 0 0 0 3 3h1v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3h1a3 3 0 0 0 3-3zM6 5h12v2H6V5zm9 14H9v-6h6v6zm3-3h-1v-3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v3H6a1 1 0 0 1-1-1V8h14v6a1 1 0 0 1-1 1z" />
						</svg>
					</div>
				</div>
				<h2>Create Account</h2>
				<p className="subtitle">Join our platform to rent computers</p>

				{error && <div className="alert alert-danger">{error}</div>}
				{warning && <div className="alert alert-warning">{warning}</div>}

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
							placeholder="Choose a username"
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
						<label htmlFor="email">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								width="16"
								height="16"
								className="input-icon"
							>
								<path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
							</svg>
							Email
						</label>
						<input
							type="email"
							id="email"
							name="email"
							value={email}
							onChange={onChange}
							placeholder="Enter your email address"
							required
						/>
					</div>
					<div className="form-group">
						<label htmlFor="fullName">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								width="16"
								height="16"
								className="input-icon"
							>
								<path d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
							</svg>
							Full Name
						</label>
						<input
							type="text"
							id="fullName"
							name="fullName"
							value={fullName}
							onChange={onChange}
							placeholder="Enter your full name"
							required
						/>
					</div>
					<button type="submit" className="btn btn-primary" disabled={loading}>
						{loading ? (
							<>
								<span className="spinner"></span>
								Creating Account...
							</>
						) : (
							"Sign Up"
						)}
					</button>
				</form>

				<div className="auth-footer">
					<p className="mt-3">
						Already have an account? <Link to="/login">Sign In</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default Register;
