const mongoose = require("mongoose");

const PasswordChangeHistorySchema = new mongoose.Schema(
	{
		computerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Computer",
			required: true,
		},
		guestId: {
			type: String,
			required: true,
		},
		password: {
			type: String,
			required: true,
		},
		changedAt: {
			type: Date,
			default: Date.now,
		},
		changedBy: {
			type: String,
			enum: ["system", "admin", "rental"],
			default: "system",
		},
		rentalId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Rental",
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

// Index for efficient queries
PasswordChangeHistorySchema.index({ computerId: 1, changedAt: -1 });

module.exports = mongoose.model(
	"PasswordChangeHistory",
	PasswordChangeHistorySchema
);
