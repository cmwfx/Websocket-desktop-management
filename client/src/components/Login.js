import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
				<h2>Login to Your Account</h2>
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
					<button type="submit" className="btn btn-primary" disabled={loading}>
						{loading ? "Logging in..." : "Login"}
					</button>
				</form>
				<p className="mt-3">
					Don't have an account? <Link to="/register">Register</Link>
				</p>
			</div>
		</div>
	);
};

export default Login;
