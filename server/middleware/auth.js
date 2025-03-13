const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to authenticate users
const authMiddleware = async (req, res, next) => {
	try {
		// Get token from header
		const token = req.header("Authorization")?.replace("Bearer ", "");

		if (!token) {
			return res
				.status(401)
				.json({ message: "No authentication token, access denied" });
		}

		// Verify token
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Find user by id
		const user = await User.findById(decoded.id).select("-password");

		if (!user) {
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

		next();
	} catch (error) {
		console.error("Auth middleware error:", error);
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
