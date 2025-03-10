const mongoose = require("mongoose");

const GuestSchema = new mongoose.Schema(
	{
		guestId: {
			type: String,
			required: true,
			unique: true,
		},
		hostname: {
			type: String,
			required: false,
		},
		ipAddress: {
			type: String,
			required: false,
		},
		osInfo: {
			type: String,
			required: false,
		},
		desktopEnvironment: {
			type: String,
			required: false,
		},
		lastSeen: {
			type: Date,
			default: Date.now,
		},
		status: {
			type: String,
			enum: ["online", "offline"],
			default: "offline",
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Guest", GuestSchema);
