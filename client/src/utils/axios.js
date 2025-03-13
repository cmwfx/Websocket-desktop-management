import axios from "axios";

// Use relative URLs in production, full URL in development
const baseURL =
	process.env.NODE_ENV === "production"
		? ""
		: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

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
		if (token) {
			config.headers["Authorization"] = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Add response interceptor to handle errors
instance.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem("token");
		}
		return Promise.reject(error);
	}
);

export default instance;
