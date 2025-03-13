import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
	const [formData, setFormData] = useState({
		username: "",
		password: "",
		confirmPassword: "",
		email: "",
		fullName: "",
	});
	const [error, setError] = useState("");
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
		setLoading(true);

		// Check if passwords match
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			setLoading(false);
			return;
		}

		try {
			const result = await register({
				username,
				password,
				email,
				fullName,
			});

			if (result.success) {
				navigate("/dashboard");
			} else {
				setError(result.error || "Registration failed. Please try again.");
			}
		} catch (err) {
			setError("Registration failed. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="register-container">
			<div className="register-form">
				<h2>Create an Account</h2>
				{error && <div className="alert alert-danger">{error}</div>}
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
						<label>Email</label>
						<input
							type="email"
							name="email"
							value={email}
							onChange={onChange}
							required
						/>
					</div>
					<div className="form-group">
						<label>Full Name</label>
						<input
							type="text"
							name="fullName"
							value={fullName}
							onChange={onChange}
							required
						/>
					</div>
					<button type="submit" className="btn btn-primary" disabled={loading}>
						{loading ? "Creating Account..." : "Register"}
					</button>
				</form>
				<p className="mt-3">
					Already have an account? <Link to="/login">Login</Link>
				</p>
			</div>
		</div>
	);
};

export default Register;
