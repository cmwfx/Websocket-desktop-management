const express = require("express");
const router = express.Router();
const CommandLog = require("../models/CommandLog");

// Get all command logs
router.get("/", async (req, res) => {
	try {
		const logs = await CommandLog.find().sort({ executedAt: -1 });
		res.json(logs);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Get command logs for a specific guest
router.get("/guest/:guestId", async (req, res) => {
	try {
		const logs = await CommandLog.find({ guestId: req.params.guestId }).sort({
			executedAt: -1,
		});
		res.json(logs);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Create a new command log
router.post("/", async (req, res) => {
	const log = new CommandLog({
		guestId: req.body.guestId,
		action: req.body.action,
		params: req.body.params || {},
		success: req.body.success,
		error: req.body.error,
	});

	try {
		const newLog = await log.save();
		res.status(201).json(newLog);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
});

module.exports = router;
