const mongoose = require("mongoose");

const ComputerSchema = new mongoose.Schema(
	{
		guestId: {
			type: String,
			required: true,
			unique: true,
			ref: "Guest",
		},
		computerName: {
			type: String,
			required: true,
		},
		isRegistered: {
			type: Boolean,
			default: false,
		},
		isRented: {
			type: Boolean,
			default: false,
		},
		status: {
			type: String,
			enum: ["available", "rented", "offline"],
			default: "offline",
		},
		currentUser: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
		hourlyRate: {
			type: Number,
			default: 1, // $1 per hour
		},
		specifications: {
			type: Object,
			default: {},
		},
		lastPasswordChange: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// Virtual for getting the guest information
ComputerSchema.virtual("guestInfo", {
	ref: "Guest",
	localField: "guestId",
	foreignField: "guestId",
	justOne: true,
});

// Method to check if computer is available for rent
ComputerSchema.methods.isAvailableForRent = function () {
	return this.isRegistered && !this.isRented && this.status === "available";
};

module.exports = mongoose.model("Computer", ComputerSchema);
