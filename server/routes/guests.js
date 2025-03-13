const express = require("express");
const router = express.Router();
const Guest = require("../models/Guest");
const Computer = require("../models/Computer");
const { adminMiddleware } = require("../middleware/auth");

// Get all guests (admin only)
router.get("/", adminMiddleware, async (req, res) => {
	try {
		// Get all guests from MongoDB that were active in the last 5 minutes
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
		const guests = await Guest.find({
			$or: [{ status: "online" }, { lastSeen: { $gte: fiveMinutesAgo } }],
		}).lean();

		// Get the in-memory guests from the global registry
		const inMemoryGuests = req.app.get("guests") || {};

		// Update the status of each guest based on both in-memory data and recent activity
		const updatedGuests = guests.map((guest) => {
			const isInMemory = inMemoryGuests[guest.guestId] !== undefined;
			const isRecentlyActive = new Date(guest.lastSeen) >= fiveMinutesAgo;
			const isOnline =
				isInMemory || (isRecentlyActive && guest.status === "online");

			return {
				...guest,
				status: isOnline ? "online" : "offline",
				lastSeen: isInMemory ? new Date() : guest.lastSeen,
				// Include any additional real-time data from memory
				...(inMemoryGuests[guest.guestId] || {}),
			};
		});

		res.json(updatedGuests);
	} catch (error) {
		console.error("Error fetching guests:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Get connected guests (admin only)
router.get("/connected", adminMiddleware, async (req, res) => {
	try {
		// Get all guests from MongoDB that were active in the last 5 minutes
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
		const guests = await Guest.find({
			$or: [{ status: "online" }, { lastSeen: { $gte: fiveMinutesAgo } }],
		}).lean();

		// Get the in-memory guests from the global registry
		const inMemoryGuests = req.app.get("guests") || {};

		// Update the status of each guest based on both in-memory data and recent activity
		const connectedGuests = guests
			.map((guest) => {
				const isInMemory = inMemoryGuests[guest.guestId] !== undefined;
				const isRecentlyActive = new Date(guest.lastSeen) >= fiveMinutesAgo;
				const isOnline =
					isInMemory || (isRecentlyActive && guest.status === "online");

				// Also check if this guest is registered as a computer
				const guestData = {
					...guest,
					status: isOnline ? "online" : "offline",
					lastSeen: isInMemory ? new Date() : guest.lastSeen,
					// Include any additional real-time data from memory
					...(inMemoryGuests[guest.guestId] || {}),
				};

				return guestData;
			})
			.filter((guest) => guest.status === "online");

		// Update computer status for any connected guests that are registered computers
		for (const guest of connectedGuests) {
			const computer = await Computer.findOne({ guestId: guest.guestId });
			if (computer) {
				computer.status = "available";
				await computer.save();
			}
		}

		res.json(connectedGuests);
	} catch (error) {
		console.error("Error fetching connected guests:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Get a specific guest
router.get("/:id", async (req, res) => {
	try {
		const guest = await Guest.findOne({ guestId: req.params.id });
		if (!guest) {
			return res.status(404).json({ message: "Guest not found" });
		}
		res.json(guest);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Update a guest's status
router.patch("/:id", async (req, res) => {
	try {
		const updatedGuest = await Guest.findOneAndUpdate(
			{ guestId: req.params.id },
			{ $set: req.body },
			{ new: true, runValidators: true }
		);

		if (!updatedGuest) {
			return res.status(404).json({ message: "Guest not found" });
		}

		res.json(updatedGuest);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
});

// Delete a guest
router.delete("/:id", async (req, res) => {
	try {
		const guest = await Guest.findOneAndDelete({ guestId: req.params.id });

		if (!guest) {
			return res.status(404).json({ message: "Guest not found" });
		}

		res.json({ message: "Guest deleted" });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

module.exports = router;
