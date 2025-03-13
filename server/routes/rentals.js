const express = require("express");
const router = express.Router();
const Rental = require("../models/Rental");
const Computer = require("../models/Computer");
const User = require("../models/User");
const PasswordChangeHistory = require("../models/PasswordChangeHistory");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Get all rentals (admin only)
router.get("/", adminMiddleware, async (req, res) => {
	try {
		const rentals = await Rental.find()
			.populate("computerId", "computerName guestId")
			.populate("userId", "username");

		res.json(rentals);
	} catch (error) {
		console.error("Error fetching rentals:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Get user's rentals
router.get("/my-rentals", authMiddleware, async (req, res) => {
	try {
		const rentals = await Rental.find({ userId: req.user.id }).populate(
			"computerId",
			"computerName guestId"
		);

		res.json(rentals);
	} catch (error) {
		console.error("Error fetching user rentals:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Get a single rental by ID
router.get("/:id", authMiddleware, async (req, res) => {
	try {
		const rental = await Rental.findById(req.params.id)
			.populate("computerId", "computerName guestId")
			.populate("userId", "username");

		if (!rental) {
			return res.status(404).json({ message: "Rental not found" });
		}

		// Check if user is admin or the rental owner
		if (req.user.role !== "admin" && rental.userId.toString() !== req.user.id) {
			return res
				.status(403)
				.json({ message: "Not authorized to view this rental" });
		}

		res.json(rental);
	} catch (error) {
		console.error("Error fetching rental:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Create a new rental (rent a computer)
router.post("/", authMiddleware, async (req, res) => {
	try {
		const { computerId, duration } = req.body;

		// Validate duration (minimum 1 hour)
		if (!duration || duration < 1) {
			return res
				.status(400)
				.json({ message: "Duration must be at least 1 hour" });
		}

		// Find computer
		const computer = await Computer.findById(computerId);
		if (!computer) {
			return res.status(404).json({ message: "Computer not found" });
		}

		// Check if computer is available and registered
		if (
			!computer.isRegistered ||
			computer.isRented ||
			computer.status !== "available"
		) {
			return res
				.status(400)
				.json({ message: "Computer is not available for rent" });
		}

		// Find user
		const user = await User.findById(req.user.id);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Calculate cost
		const cost = computer.hourlyRate * duration;

		// Check if user has enough credits
		if (user.credits < cost) {
			return res.status(400).json({
				message: "Insufficient credits",
				required: cost,
				available: user.credits,
			});
		}

		// Get the current password from password history or generate a new one
		let password;
		const latestPasswordChange = await PasswordChangeHistory.findOne({
			computerId: computer._id,
		}).sort({ changedAt: -1 });

		if (latestPasswordChange) {
			password = latestPasswordChange.password;
		} else {
			// Generate a random password
			password = Math.random().toString(36).slice(-8);

			// Create password history entry
			const passwordHistory = new PasswordChangeHistory({
				computerId: computer._id,
				guestId: computer.guestId,
				password,
				changedBy: "system",
			});

			await passwordHistory.save();
		}

		// Calculate end time
		const startTime = new Date();
		const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

		// Create rental
		const rental = new Rental({
			computerId: computer._id,
			userId: user._id,
			guestId: computer.guestId,
			startTime,
			duration,
			endTime,
			cost,
			status: "active",
			password,
		});

		await rental.save();

		// Update computer status
		computer.status = "rented";
		computer.isRented = true;
		computer.currentUser = user._id;
		await computer.save();

		// Deduct credits from user
		user.credits -= cost;
		await user.save();

		// Schedule rental expiration
		scheduleRentalExpiration(rental._id, endTime);

		res.status(201).json(rental);
	} catch (error) {
		console.error("Error creating rental:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Cancel a rental
router.post("/:id/cancel", authMiddleware, async (req, res) => {
	try {
		const rental = await Rental.findById(req.params.id);
		if (!rental) {
			return res.status(404).json({ message: "Rental not found" });
		}

		// Check if user is admin or the rental owner
		if (req.user.role !== "admin" && rental.userId.toString() !== req.user.id) {
			return res
				.status(403)
				.json({ message: "Not authorized to cancel this rental" });
		}

		// Check if rental is active
		if (rental.status !== "active") {
			return res
				.status(400)
				.json({ message: "Only active rentals can be cancelled" });
		}

		// Update rental status
		rental.status = "cancelled";
		await rental.save();

		// Update computer status
		const computer = await Computer.findById(rental.computerId);
		if (computer) {
			computer.status = "available";
			computer.isRented = false;
			computer.currentUser = null;
			await computer.save();
		}

		// Refund credits to user (partial refund based on time used)
		const user = await User.findById(rental.userId);
		if (user) {
			const timeUsed = (Date.now() - rental.startTime) / (60 * 60 * 1000); // in hours
			const timeRemaining = Math.max(0, rental.duration - timeUsed);
			const refundAmount = Math.floor(timeRemaining * computer.hourlyRate);

			if (refundAmount > 0) {
				user.credits += refundAmount;
				await user.save();
			}
		}

		res.json({ message: "Rental cancelled successfully", rental });
	} catch (error) {
		console.error("Error cancelling rental:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Helper function to schedule rental expiration
function scheduleRentalExpiration(rentalId, endTime) {
	const now = new Date();
	const timeUntilExpiration = endTime.getTime() - now.getTime();

	if (timeUntilExpiration <= 0) {
		// Rental already expired
		expireRental(rentalId);
		return;
	}

	// Schedule expiration
	setTimeout(() => {
		expireRental(rentalId);
	}, timeUntilExpiration);
}

// Helper function to expire a rental
async function expireRental(rentalId) {
	try {
		const rental = await Rental.findById(rentalId);
		if (!rental || rental.status !== "active") {
			return;
		}

		// Update rental status
		rental.status = "expired";
		await rental.save();

		// Update computer status
		const computer = await Computer.findById(rental.computerId);
		if (computer) {
			computer.status = "available";
			computer.isRented = false;
			computer.currentUser = null;
			await computer.save();

			// Generate a new password
			const newPassword = Math.random().toString(36).slice(-8);

			// Create password history entry
			const passwordHistory = new PasswordChangeHistory({
				computerId: computer._id,
				guestId: computer.guestId,
				password: newPassword,
				changedBy: "rental",
				rentalId: rental._id,
			});

			await passwordHistory.save();

			// Send command to change password and lock computer
			const guest = guests[computer.guestId];
			if (guest && guest.id) {
				// Change password command
				io.to(guest.id).emit("executeCommand", {
					action: "changePassword",
					params: { newPassword },
				});

				// Lock computer command
				setTimeout(() => {
					io.to(guest.id).emit("executeCommand", {
						action: "lockComputer",
					});
				}, 5000); // Wait 5 seconds before locking
			}

			// Notify clients about the rental expiration
			io.to(`rental:${rental._id}`).emit("rentalExpired", {
				rentalId: rental._id,
			});
			io.emit("computerUpdate", {
				computerId: computer._id,
				status: "available",
				isRented: false,
			});
		}
	} catch (error) {
		console.error("Error expiring rental:", error);
	}
}

module.exports = router;
