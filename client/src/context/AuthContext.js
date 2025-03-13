import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "../utils/axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
	const [auth, setAuth] = useState({
		token: localStorage.getItem("token"),
		isAuthenticated: false,
		user: null,
		loading: true,
	});

	useEffect(() => {
		const loadUser = async () => {
			if (auth.token) {
				try {
					// Set the default headers for all axios requests
					axios.defaults.headers.common[
						"Authorization"
					] = `Bearer ${auth.token}`;

					const res = await axios.get("/api/auth/profile");
					console.log("Profile response:", res.data);

					setAuth({
						token: auth.token,
						isAuthenticated: true,
						user: res.data,
						loading: false,
					});
					console.log("Updated auth state:", {
						token: auth.token,
						isAuthenticated: true,
						user: res.data,
						loading: false,
					});
				} catch (err) {
					console.error("Load user error:", err);
					// If token is invalid or expired, clear everything
					localStorage.removeItem("token");
					delete axios.defaults.headers.common["Authorization"];

					setAuth({
						token: null,
						isAuthenticated: false,
						user: null,
						loading: false,
					});
				}
			} else {
				setAuth((prev) => ({ ...prev, loading: false }));
			}
		};

		loadUser();
	}, [auth.token]);

	const login = async (username, password) => {
		try {
			const res = await axios.post("/api/auth/login", { username, password });
			console.log("Login response:", res.data);

			localStorage.setItem("token", res.data.token);

			setAuth({
				token: res.data.token,
				isAuthenticated: true,
				user: res.data.user,
				loading: false,
			});
			console.log("Auth state after login:", {
				token: res.data.token,
				isAuthenticated: true,
				user: res.data.user,
				loading: false,
			});

			return { success: true };
		} catch (err) {
			console.error("Login error:", err);
			return {
				success: false,
				error: err.response?.data?.message || "Login failed",
			};
		}
	};

	const register = async (userData) => {
		try {
			console.log("Sending registration request:", userData);
			const res = await axios.post("/api/auth/register", userData);
			console.log("Registration response:", res.data);

			// Check if we got a token back
			if (res.data.token) {
				localStorage.setItem("token", res.data.token);

				setAuth({
					token: res.data.token,
					isAuthenticated: true,
					user: res.data.user,
					loading: false,
				});

				return { success: true };
			} else if (
				res.data.message &&
				res.data.message.includes("token generation failed")
			) {
				// Handle case where user was created but token generation failed
				return {
					success: true,
					warning: "Account created but you need to log in separately",
				};
			}

			// Unexpected response format
			return {
				success: false,
				error: "Registration succeeded but response format was unexpected",
			};
		} catch (err) {
			console.error("Registration error:", err);
			// Check if the error has a response from the server
			if (err.response) {
				console.error("Server response:", err.response.data);
				return {
					success: false,
					error: err.response.data.message || "Registration failed",
				};
			}
			// Network error or other issue
			return {
				success: false,
				error:
					err.message || "Registration failed. Please check your connection.",
			};
		}
	};

	const logout = () => {
		localStorage.removeItem("token");
		delete axios.defaults.headers.common["Authorization"];

		setAuth({
			token: null,
			isAuthenticated: false,
			user: null,
			loading: false,
		});
	};

	return (
		<AuthContext.Provider
			value={{
				auth,
				setAuth,
				login,
				register,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export default AuthContext;
