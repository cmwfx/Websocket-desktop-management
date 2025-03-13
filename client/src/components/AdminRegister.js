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
				<h2>Create Admin Account</h2>
				{error && <div className="alert alert-danger">{error}</div>}
				{success && <div className="alert alert-success">{success}</div>}
				<form onSubmit={onSubmit}>
					<div className="form-group">
						<label>Username</label>
						<input
							type="text"
							name="username"
							value={username}
							onChange={onChange}
							required
						/>
					</div>
					<div className="form-group">
						<label>Password</label>
						<input
							type="password"
							name="password"
							value={password}
							onChange={onChange}
							required
						/>
					</div>
					<div className="form-group">
						<label>Confirm Password</label>
						<input
							type="password"
							name="confirmPassword"
							value={confirmPassword}
							onChange={onChange}
							required
						/>
					</div>
					<div className="form-group">
						<label>Admin Secret</label>
						<input
							type="password"
							name="adminSecret"
							value={adminSecret}
							onChange={onChange}
							required
						/>
						<small className="form-text">
							This is the secret key set in your server's environment variables.
						</small>
					</div>
					<button type="submit" className="btn btn-primary" disabled={loading}>
						{loading ? "Creating Admin Account..." : "Register Admin"}
					</button>
				</form>
				<p className="mt-3">
					<Link to="/login">Back to Login</Link>
				</p>
			</div>
		</div>
	);
};

export default AdminRegister;
