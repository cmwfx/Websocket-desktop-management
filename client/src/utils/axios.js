import axios from "axios";

// Use relative URLs in production, full URL in development
const baseURL =
	process.env.NODE_ENV === "production"
		? ""
		: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

console.log("Axios baseURL:", baseURL); // Debug log

const instance = axios.create({
	baseURL,
	headers: {
		"Content-Type": "application/json",
	},
});

// Add request interceptor to add Authorization header
instance.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("token");
		console.log("Request URL:", config.url); // Debug log
		console.log("Token from localStorage:", token ? "exists" : "not found"); // Debug log

		if (token) {
			config.headers["Authorization"] = `Bearer ${token}`;
			console.log("Added Authorization header:", `Bearer ${token}`); // Debug log
		}
		return config;
	},
	(error) => {
		console.error("Request interceptor error:", error); // Debug log
		return Promise.reject(error);
	}
);

// Add response interceptor to handle errors
instance.interceptors.response.use(
	(response) => {
		console.log(
			"Response from:",
			response.config.url,
			"Status:",
			response.status
		); // Debug log
		return response;
	},
	(error) => {
		console.error("Response error:", {
			url: error.config?.url,
			status: error.response?.status,
			data: error.response?.data,
		}); // Debug log

		if (error.response?.status === 401) {
			console.log("401 error detected, removing token"); // Debug log
			localStorage.removeItem("token");
		}
		return Promise.reject(error);
	}
);

export default instance;
