const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to authenticate users
const authMiddleware = async (req, res, next) => {
	try {
		// Get token from header
		const authHeader = req.header("Authorization");
		console.log("Auth header received:", authHeader); // Debug log

		const token = authHeader?.replace("Bearer ", "");
		console.log("Token after Bearer removal:", token ? "exists" : "not found"); // Debug log

		if (!token) {
			console.log("No token found in request"); // Debug log
			return res
				.status(401)
				.json({ message: "No authentication token, access denied" });
		}

		// Verify token
		console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET); // Debug log
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		console.log("Token decoded successfully:", decoded); // Debug log

		// Find user by id
		const user = await User.findById(decoded.id).select("-password");
		console.log("User found:", user ? "yes" : "no"); // Debug log

		if (!user) {
			console.log("No user found for decoded token"); // Debug log
			return res
				.status(401)
				.json({ message: "Token is valid but user not found" });
		}

		// Add user to request object
		req.user = {
			id: user._id,
			username: user.username,
			role: user.role,
		};
		console.log("User added to request:", req.user); // Debug log

		next();
	} catch (error) {
		console.error("Auth middleware error details:", {
			name: error.name,
			message: error.message,
			stack: error.stack,
		}); // Debug log

		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ message: "Invalid token" });
		}
		if (error.name === "TokenExpiredError") {
			return res.status(401).json({ message: "Token expired" });
		}
		res.status(500).json({ message: "Server error" });
	}
};

// Middleware to check if user is admin
const adminMiddleware = async (req, res, next) => {
	try {
		// First authenticate the user
		await authMiddleware(req, res, () => {
			// Check if user is admin
			if (req.user.role !== "admin") {
				return res
					.status(403)
					.json({ message: "Access denied. Admin privileges required." });
			}
			next();
		});
	} catch (error) {
		console.error("Admin middleware error:", error);
		res.status(500).json({ message: "Server error" });
	}
};

module.exports = { authMiddleware, adminMiddleware };
