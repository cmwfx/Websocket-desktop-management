const express = require("express");
const router = express.Router();
const Computer = require("../models/Computer");
const Guest = require("../models/Guest");
const PasswordChangeHistory = require("../models/PasswordChangeHistory");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Get all computers (public)
router.get("/", async (req, res) => {
	try {
		const computers = await Computer.find().populate("guestInfo").populate({
			path: "currentUser",
			select: "username -_id",
		});

		res.json(computers);
	} catch (error) {
		console.error("Error fetching computers:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Get available computers (public)
router.get("/available", async (req, res) => {
	try {
		const computers = await Computer.find({
			isRegistered: true,
			isRented: false,
			status: "available",
		}).populate("guestInfo");

		// Filter out computers whose guests are offline
		const availableComputers = computers.filter(
			(computer) => computer.guestInfo && computer.guestInfo.status === "online"
		);

		res.json(availableComputers);
	} catch (error) {
		console.error("Error fetching available computers:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Get a single computer by ID
router.get("/:id", async (req, res) => {
	try {
		const computer = await Computer.findById(req.params.id)
			.populate("guestInfo")
			.populate({
				path: "currentUser",
				select: "username -_id",
			});

		if (!computer) {
			return res.status(404).json({ message: "Computer not found" });
		}

		res.json(computer);
	} catch (error) {
		console.error("Error fetching computer:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Create a new computer (admin only)
router.post("/", adminMiddleware, async (req, res) => {
	try {
		const { guestId, computerName, hourlyRate, specifications } = req.body;

		// Check if guest exists
		const guest = await Guest.findOne({ guestId });
		if (!guest) {
			return res.status(404).json({ message: "Guest not found" });
		}

		// Check if computer already exists for this guest
		const existingComputer = await Computer.findOne({ guestId });
		if (existingComputer) {
			return res
				.status(400)
				.json({ message: "Computer already exists for this guest" });
		}

		// Create new computer
		const computer = new Computer({
			guestId,
			computerName,
			hourlyRate: hourlyRate || 1,
			specifications: specifications || {},
			status: "available",
		});

		await computer.save();

		res.status(201).json(computer);
	} catch (error) {
		console.error("Error creating computer:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Update a computer (admin only)
router.put("/:id", adminMiddleware, async (req, res) => {
	try {
		const { computerName, hourlyRate, specifications, status } = req.body;

		// Find computer
		const computer = await Computer.findById(req.params.id);
		if (!computer) {
			return res.status(404).json({ message: "Computer not found" });
		}

		// Update fields
		if (computerName) computer.computerName = computerName;
		if (hourlyRate) computer.hourlyRate = hourlyRate;
		if (specifications) computer.specifications = specifications;
		if (status) computer.status = status;

		await computer.save();

		res.json(computer);
	} catch (error) {
		console.error("Error updating computer:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Delete a computer (admin only)
router.delete("/:id", adminMiddleware, async (req, res) => {
	try {
		const computer = await Computer.findById(req.params.id);
		if (!computer) {
			return res.status(404).json({ message: "Computer not found" });
		}

		// Check if computer is currently rented
		if (computer.status === "rented") {
			return res
				.status(400)
				.json({ message: "Cannot delete a rented computer" });
		}

		await computer.remove();

		res.json({ message: "Computer deleted successfully" });
	} catch (error) {
		console.error("Error deleting computer:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Register a guest as a computer (admin only)
router.post("/register-guest", adminMiddleware, async (req, res) => {
	try {
		const { guestId, computerName, hourlyRate } = req.body;

		// Check if guest exists
		const guest = await Guest.findOne({ guestId });
		if (!guest) {
			return res.status(404).json({ message: "Guest not found" });
		}

		// Check if computer already exists for this guest
		const existingComputer = await Computer.findOne({ guestId });
		if (existingComputer) {
			return res
				.status(400)
				.json({ message: "Computer already exists for this guest" });
		}

		// Create new computer
		const computer = new Computer({
			guestId,
			computerName: computerName || guest.hostname || `Computer-${guestId}`,
			hourlyRate: hourlyRate || 1,
			specifications: {
				osInfo: guest.osInfo,
				windowsVersion: guest.windowsVersion,
				desktopEnvironment: guest.desktopEnvironment,
			},
			status: "available",
			isRegistered: true, // Set as registered when created by admin
			isRented: false, // Initially not rented
		});

		await computer.save();

		res.status(201).json(computer);
	} catch (error) {
		console.error("Error registering guest as computer:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Change computer password (admin only)
router.post("/:id/change-password", adminMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const { newPassword } = req.body;

		// Validate password
		if (!newPassword || newPassword.length < 6) {
			return res
				.status(400)
				.json({ message: "Password must be at least 6 characters long" });
		}

		// Find computer
		const computer = await Computer.findById(id);
		if (!computer) {
			return res.status(404).json({ message: "Computer not found" });
		}

		// Create password history entry
		const passwordHistory = new PasswordChangeHistory({
			computerId: computer._id,
			guestId: computer.guestId,
			password: newPassword,
			changedBy: "admin",
		});

		await passwordHistory.save();

		// Update computer's lastPasswordChange
		computer.lastPasswordChange = new Date();
		await computer.save();

		// Get the socket instance for the guest
		const guests = req.app.get("guests") || {};
		const guest = guests[computer.guestId];

		if (guest && guest.id) {
			// Send command to change password
			req.app.get("io").to(guest.id).emit("executeCommand", {
				action: "changePassword",
				params: { newPassword },
			});

			res.json({
				message: "Password change command sent successfully",
				computer: {
					_id: computer._id,
					computerName: computer.computerName,
					lastPasswordChange: computer.lastPasswordChange,
				},
			});
		} else {
			// If computer is offline, still save the password but inform admin
			res.json({
				message:
					"Password saved but computer is offline. Changes will apply when computer connects.",
				computer: {
					_id: computer._id,
					computerName: computer.computerName,
					lastPasswordChange: computer.lastPasswordChange,
				},
			});
		}
	} catch (error) {
		console.error("Error changing computer password:", error);
		res.status(500).json({ message: "Server error" });
	}
});

module.exports = router;
