const mongoose = require("mongoose");

const GuestSchema = new mongoose.Schema(
	{
		guestId: {
			type: String,
			required: true,
		},
		hostname: {
			type: String,
			required: true,
		},
		ipAddress: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		osInfo: {
			type: String,
			required: true,
		},
		desktopEnvironment: {
			type: String,
			default: "Unknown",
		},
		windowsVersion: {
			type: String,
			default: "Unknown",
		},
		lastSeen: {
			type: Date,
			default: Date.now,
		},
		status: {
			type: String,
			enum: ["online", "offline", "unknown"],
			default: "unknown",
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

GuestSchema.methods.updateLastSeen = function () {
	this.lastSeen = new Date();
	return this.save();
};

module.exports = mongoose.model("Guest", GuestSchema);
