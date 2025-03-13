const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Register a new user
router.post("/register", async (req, res) => {
	try {
		console.log("Registration request received:", req.body);
		const { username, password, email, fullName } = req.body;

		// Check if user already exists
		const existingUser = await User.findOne({ username });
		if (existingUser) {
			return res.status(400).json({ message: "Username already exists" });
		}

		// Create new user
		const user = new User({
			username,
			password, // Will be hashed by the pre-save hook
			email,
			fullName,
			role: "user", // Default role
			credits: 0, // Start with 0 credits
		});

		await user.save();
		console.log("User saved successfully:", user._id);

		// Generate JWT token
		console.log(
			"Generating JWT token with secret:",
			process.env.JWT_SECRET ? "Secret exists" : "Secret missing"
		);
		try {
			const token = jwt.sign(
				{ id: user._id, username: user.username, role: user.role },
				process.env.JWT_SECRET || "fallback_secret_for_development",
				{ expiresIn: "24h" }
			);
			console.log("JWT token generated successfully");

			// Return user info and token (excluding password)
			const userResponse = {
				_id: user._id,
				username: user.username,
				email: user.email,
				fullName: user.fullName,
				role: user.role,
				credits: user.credits,
			};

			console.log("Sending successful response");
			return res.status(201).json({ user: userResponse, token });
		} catch (jwtError) {
			console.error("JWT Error:", jwtError);
			// If JWT fails, still return success but without token
			return res.status(201).json({
				message: "User registered but token generation failed",
				user: {
					_id: user._id,
					username: user.username,
				},
			});
		}
	} catch (error) {
		console.error("Registration error:", error);
		res.status(500).json({ message: "Server error during registration" });
	}
});

// Login user
router.post("/login", async (req, res) => {
	try {
		const { username, password } = req.body;

		// Find user
		const user = await User.findOne({ username });
		if (!user) {
			return res.status(401).json({ message: "Invalid credentials" });
		}

		// Check password
		const isMatch = await user.comparePassword(password);
		if (!isMatch) {
			return res.status(401).json({ message: "Invalid credentials" });
		}

		// Generate JWT token
		const token = jwt.sign(
			{ id: user._id, username: user.username, role: user.role },
			process.env.JWT_SECRET || "fallback_secret_for_development",
			{ expiresIn: "24h" }
		);

		// Return user info and token (excluding password)
		const userResponse = {
			_id: user._id,
			username: user.username,
			email: user.email,
			fullName: user.fullName,
			role: user.role,
			credits: user.credits,
		};

		res.json({ user: userResponse, token });
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ message: "Server error during login" });
	}
});

// Get current user profile
router.get("/profile", authMiddleware, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("-password");
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		res.json(user);
	} catch (error) {
		console.error("Profile error:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Create admin user (for initial setup)
router.post("/create-admin", async (req, res) => {
	try {
		const { username, password, adminSecret } = req.body;

		console.log("Received admin secret:", adminSecret);
		console.log("Expected admin secret from env:", process.env.ADMIN_SECRET);

		// Verify admin secret
		if (adminSecret !== process.env.ADMIN_SECRET) {
			return res.status(401).json({ message: "Invalid admin secret" });
		}

		// Check if user already exists
		const existingUser = await User.findOne({ username });
		if (existingUser) {
			return res.status(400).json({ message: "Username already exists" });
		}

		// Create admin user
		const admin = new User({
			username,
			password, // Will be hashed by the pre-save hook
			role: "admin",
			credits: 0, // Admins don't need credits
		});

		await admin.save();

		res.status(201).json({ message: "Admin user created successfully" });
	} catch (error) {
		console.error("Admin creation error:", error);
		res.status(500).json({ message: "Server error during admin creation" });
	}
});

module.exports = router;
