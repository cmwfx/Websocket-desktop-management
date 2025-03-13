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

					setAuth({
						token: auth.token,
						isAuthenticated: true,
						user: res.data,
						loading: false,
					});
				} catch (err) {
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

			localStorage.setItem("token", res.data.token);

			setAuth({
				token: res.data.token,
				isAuthenticated: true,
				user: res.data.user,
				loading: false,
			});

			return { success: true };
		} catch (err) {
			return {
				success: false,
				error: err.response?.data?.message || "Login failed",
			};
		}
	};

	const register = async (userData) => {
		try {
			const res = await axios.post("/api/auth/register", userData);

			localStorage.setItem("token", res.data.token);

			setAuth({
				token: res.data.token,
				isAuthenticated: true,
				user: res.data.user,
				loading: false,
			});

			return { success: true };
		} catch (err) {
			return {
				success: false,
				error: err.response?.data?.message || "Registration failed",
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
