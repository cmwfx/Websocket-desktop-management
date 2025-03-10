const express = require("express");
const router = express.Router();
const Guest = require("../models/Guest");

// Get all guests
router.get("/", async (req, res) => {
	try {
		const guests = await Guest.find();
		res.json(guests);
	} catch (err) {
		res.status(500).json({ message: err.message });
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
