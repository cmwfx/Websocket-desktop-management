const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
		unique: true,
		trim: true,
	},
	password: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: false,
		unique: true,
		sparse: true,
		trim: true,
	},
	fullName: {
		type: String,
		required: false,
	},
	role: {
		type: String,
		enum: ["user", "admin"],
		default: "user",
	},
	credits: {
		type: Number,
		default: 0,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
	// Only hash the password if it's modified (or new)
	if (!this.isModified("password")) return next();

	try {
		// Generate salt
		const salt = await bcrypt.genSalt(10);
		// Hash password
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch (error) {
		next(error);
	}
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
	try {
		return await bcrypt.compare(candidatePassword, this.password);
	} catch (error) {
		throw error;
	}
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
