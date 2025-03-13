import axios from "axios";

// Use relative URLs in production, full URL in development
const baseURL =
	process.env.NODE_ENV === "production"
		? ""
		: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const instance = axios.create({
	baseURL,
});

export default instance;
