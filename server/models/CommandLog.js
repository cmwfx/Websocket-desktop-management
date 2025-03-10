const mongoose = require("mongoose");

const CommandLogSchema = new mongoose.Schema(
	{
		guestId: {
			type: String,
			required: true,
		},
		action: {
			type: String,
			required: true,
		},
		params: {
			type: Object,
			default: {},
		},
		success: {
			type: Boolean,
			default: false,
		},
		error: {
			type: String,
			default: null,
		},
		executedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("CommandLog", CommandLogSchema);
