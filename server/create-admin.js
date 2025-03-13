require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

// Admin user details
const adminUsername = "admin";
const adminPassword = "admin123"; // Change this to a secure password

// Connect to MongoDB
mongoose
	.connect(process.env.MONGODB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(async () => {
		console.log("Connected to MongoDB");

		try {
			// Check if admin already exists
			const existingAdmin = await User.findOne({ username: adminUsername });
			if (existingAdmin) {
				console.log("Admin user already exists");
				mongoose.disconnect();
				return;
			}

			// Create admin user
			const admin = new User({
				username: adminUsername,
				password: adminPassword,
				role: "admin",
				credits: 0,
			});

			await admin.save();
			console.log("Admin user created successfully");
		} catch (error) {
			console.error("Error creating admin user:", error);
		} finally {
			mongoose.disconnect();
			console.log("Disconnected from MongoDB");
		}
	})
	.catch((err) => {
		console.error("MongoDB connection error:", err);
	});
