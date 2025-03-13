const mongoose = require("mongoose");

const RentalSchema = new mongoose.Schema(
	{
		computerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Computer",
			required: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		guestId: {
			type: String,
			required: true,
		},
		startTime: {
			type: Date,
			default: Date.now,
		},
		duration: {
			type: Number, // Duration in hours
			required: true,
			min: 1, // Minimum 1 hour
		},
		endTime: {
			type: Date,
			required: true,
		},
		cost: {
			type: Number,
			required: true,
		},
		status: {
			type: String,
			enum: ["active", "expired", "cancelled"],
			default: "active",
		},
		password: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

// Index for efficient queries
RentalSchema.index({ userId: 1, status: 1 });
RentalSchema.index({ computerId: 1, status: 1 });
RentalSchema.index({ endTime: 1, status: 1 });

module.exports = mongoose.model("Rental", RentalSchema);
