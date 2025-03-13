const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Get all users (admin only)
router.get("/", adminMiddleware, async (req, res) => {
	try {
		const users = await User.find().select("-password");
		res.json(users);
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Get a single user by ID (admin only)
router.get("/:id", adminMiddleware, async (req, res) => {
	try {
		const user = await User.findById(req.params.id).select("-password");
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		res.json(user);
	} catch (error) {
		console.error("Error fetching user:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Add credits to a user (admin only)
router.post("/:userId/add-credits", adminMiddleware, async (req, res) => {
	try {
		const { userId } = req.params;
		const { credits } = req.body;

		if (!credits || credits <= 0) {
			return res.status(400).json({ message: "Invalid credit amount" });
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Add credits to user's balance
		user.credits = (user.credits || 0) + credits;
		await user.save();

		res.json({
			message: "Credits added successfully",
			user: {
				_id: user._id,
				username: user.username,
				credits: user.credits,
			},
		});
	} catch (error) {
		console.error("Error adding credits:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Update user (admin only)
router.put("/:id", adminMiddleware, async (req, res) => {
	try {
		const { username, email, fullName, role } = req.body;

		// Find user
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Update fields
		if (username) {
			// Check if username is already taken
			const existingUser = await User.findOne({
				username,
				_id: { $ne: user._id },
			});
			if (existingUser) {
				return res.status(400).json({ message: "Username already exists" });
			}
			user.username = username;
		}

		if (email) {
			// Check if email is already taken
			const existingUser = await User.findOne({
				email,
				_id: { $ne: user._id },
			});
			if (existingUser) {
				return res.status(400).json({ message: "Email already exists" });
			}
			user.email = email;
		}

		if (fullName) user.fullName = fullName;
		if (role && ["user", "admin"].includes(role)) user.role = role;

		await user.save();

		// Return updated user (excluding password)
		const updatedUser = await User.findById(user._id).select("-password");
		res.json(updatedUser);
	} catch (error) {
		console.error("Error updating user:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Delete user (admin only)
router.delete("/:id", adminMiddleware, async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Prevent deleting the last admin
		if (user.role === "admin") {
			const adminCount = await User.countDocuments({ role: "admin" });
			if (adminCount <= 1) {
				return res
					.status(400)
					.json({ message: "Cannot delete the last admin user" });
			}
		}

		await user.remove();

		res.json({ message: "User deleted successfully" });
	} catch (error) {
		console.error("Error deleting user:", error);
		res.status(500).json({ message: "Server error" });
	}
});

module.exports = router;
