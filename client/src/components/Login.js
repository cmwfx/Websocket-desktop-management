import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

const Login = () => {
	const [formData, setFormData] = useState({
		username: "",
		password: "",
	});
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const { login } = useAuth();

	const { username, password } = formData;

	const onChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const onSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const result = await login(username, password);

			if (result.success) {
				navigate("/dashboard");
			} else {
				setError(result.error || "Login failed. Please try again.");
			}
		} catch (err) {
			setError("Login failed. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="login-container">
			<div className="login-form">
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
				<h2>Welcome Back</h2>
				<p className="subtitle">Sign in to your account to continue</p>

				{error && <div className="alert alert-danger">{error}</div>}

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
							placeholder="Enter your username"
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
							placeholder="Enter your password"
							required
						/>
					</div>
					<button type="submit" className="btn btn-primary" disabled={loading}>
						{loading ? (
							<>
								<span className="spinner"></span>
								Logging in...
							</>
						) : (
							"Sign In"
						)}
					</button>
				</form>

				<div className="auth-footer">
					<p className="mt-3">
						Don't have an account? <Link to="/register">Create Account</Link>
					</p>
					<div className="admin-link-container">
						<Link to="/admin-register" className="admin-link">
							Admin Registration
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Login;
