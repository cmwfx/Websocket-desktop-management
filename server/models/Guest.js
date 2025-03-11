const mongoose = require("mongoose");

const GuestSchema = new mongoose.Schema(
	{
		guestId: {
			type: String,
			required: true,
			unique: true,
			index: true,
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
		windowsVersion: {
			type: String,
			required: false,
		},
		lastSeen: {
			type: Date,
			default: Date.now,
			index: true,
		},
		status: {
			type: String,
			enum: ["online", "offline"],
			default: "offline",
			index: true,
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
