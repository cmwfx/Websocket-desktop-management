const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { ServerApiVersion } = require("mongodb");
const { v4: uuidv4 } = require("uuid");

// Import routes
const guestRoutes = require("./routes/guests");
const commandRoutes = require("./routes/commands");
const authRoutes = require("./routes/auth");
const computerRoutes = require("./routes/computers");
const rentalRoutes = require("./routes/rentals");
const userRoutes = require("./routes/users");

// Import models
const Guest = require("./models/Guest");
const CommandLog = require("./models/CommandLog");
const Computer = require("./models/Computer");
const Rental = require("./models/Rental");
const PasswordChangeHistory = require("./models/PasswordChangeHistory");

// Load environment variables
dotenv.config();

// Verify critical environment variables
console.log("Checking environment variables...");
if (!process.env.JWT_SECRET) {
	console.error("WARNING: JWT_SECRET is not set!");
	process.env.JWT_SECRET = "development_jwt_secret"; // Fallback for development
}
console.log("JWT_SECRET status:", process.env.JWT_SECRET ? "set" : "not set");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// API Routes first
app.use("/api/guests", guestRoutes);
app.use("/api/commands", commandRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/computers", computerRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/users", userRoutes);

// Serve static files from the React app in production
if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "../client/build")));

	// Handle React routing, return all requests to React app
	app.get("*", function (req, res) {
		res.sendFile(path.join(__dirname, "../client/build", "index.html"));
	});
}

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
	cors: {
		origin: "*", // In production, restrict this to your frontend URL
		methods: ["GET", "POST"],
	},
});

// Make io instance available to routes
app.set("io", io);

// Start the server after MongoDB connection attempt
function startServer() {
	const PORT = process.env.PORT || 5000;
	server.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
}

// MongoDB Connection
const MONGODB_URI =
	"mongodb+srv://llccmw:Cathe1995!Cmw@desktopmanagement.2z7ak.mongodb.net/?retryWrites=true&w=majority&appName=DesktopManagement";

// Flag to track MongoDB connection status
let isMongoConnected = false;

// Helper function to safely perform database operations
async function safeDbOperation(operation, fallback = null) {
	if (!isMongoConnected) {
		console.log("Skipping database operation - MongoDB not connected");
		return fallback;
	}

	try {
		return await operation();
	} catch (err) {
		console.error("Database operation failed:", err);
		return fallback;
	}
}

// Connect to MongoDB, then start the server
console.log("Starting application...");
mongoose
	.connect(MONGODB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true,
		},
		// Set a shorter connection timeout to fail faster if MongoDB is unreachable
		connectTimeoutMS: 5000,
		// Set a shorter socket timeout
		socketTimeoutMS: 45000,
	})
	.then(() => {
		console.log("Connected to MongoDB Atlas");
		isMongoConnected = true;
		startServer();
	})
	.catch((err) => {
		console.error("MongoDB connection error:", err);
		console.log("Application will continue without database persistence");
		isMongoConnected = false;
		startServer();
	});

// In-memory registry for guest agents
const guests = {};

// Make guests registry available to routes
app.set("guests", guests);

// Helper function to get full guest list with status
async function getFullGuestList() {
	try {
		// Get all guests from MongoDB that were active in the last 5 minutes
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
		const dbGuests = await Guest.find({
			$or: [{ lastSeen: { $gte: fiveMinutesAgo } }, { status: "online" }],
		});

		// Convert to object for easier lookup
		const guestMap = {};
		dbGuests.forEach((guest) => {
			const guestObj = guest.toObject();

			// Check if guest is in memory (currently connected)
			if (guests[guest.guestId]) {
				guestObj.status = "online";
				guestObj.lastSeen = guests[guest.guestId].lastSeen;
			} else if (guest.lastSeen >= fiveMinutesAgo) {
				guestObj.status = "online";
			} else {
				guestObj.status = "offline";
			}

			guestMap[guest.guestId] = guestObj;
		});

		// Add any in-memory guests that might not be in DB yet
		Object.entries(guests).forEach(([guestId, guestData]) => {
			if (!guestMap[guestId]) {
				guestMap[guestId] = {
					guestId,
					...guestData,
					status: "online",
				};
			}
		});

		return Object.values(guestMap);
	} catch (error) {
		console.error("Error getting full guest list:", error);
		// Return in-memory guests as fallback
		return Object.entries(guests).map(([guestId, data]) => ({
			guestId,
			...data,
		}));
	}
}

// Socket.IO connection handler
io.on("connection", (socket) => {
	console.log("New client connected:", socket.id);

	// Handle guest registration
	socket.on("registerGuest", async (guestData) => {
		console.log("Registering guest:", guestData);
		const guestId = guestData.guestId || uuidv4();

		try {
			// Store socket ID for this guest
			guests[guestId] = {
				...guestData,
				socketId: socket.id,
				connected: true,
				status: "online",
			};

			// Associate socket with guestId for later reference
			socket.guestId = guestId;

			// Save or update guest in database
			let guest = await Guest.findOne({ guestId });
			if (guest) {
				// Update existing guest
				guest.status = "online";
				guest.hostname = guestData.hostname || guest.hostname;
				guest.ipAddress = guestData.ipAddress || guest.ipAddress;
				guest.osInfo = guestData.osInfo || guest.osInfo;
				guest.windowsVersion = guestData.windowsVersion || guest.windowsVersion;
				guest.desktopEnvironment =
					guestData.desktopEnvironment || guest.desktopEnvironment;
				guest.lastSeen = new Date();
				await guest.save();

				console.log(`Updated existing guest in database: ${guestId}`);

				// Check if this guest is registered as a computer
				const computer = await Computer.findOne({ guestId });
				if (computer) {
					console.log(
						`Guest ${guestId} is a registered computer (${computer.computerName})`
					);
					// Update computer status if needed
					if (computer.status !== "available") {
						computer.status = "available";
						await computer.save();
						console.log(
							`Updated computer status to available: ${computer.computerName}`
						);
						// Emit computer update to all clients
						io.emit("computerUpdated", { computer });
					}
				}
			} else {
				// Create new guest
				guest = new Guest({
					guestId,
					status: "online",
					hostname: guestData.hostname,
					ipAddress: guestData.ipAddress,
					osInfo: guestData.osInfo,
					windowsVersion: guestData.windowsVersion,
					desktopEnvironment: guestData.desktopEnvironment,
					lastSeen: new Date(),
				});
				await guest.save();
				console.log(`Created new guest in database: ${guestId}`);
			}

			// Send confirmation to the client with the guestId
			socket.emit("guestRegistered", { guestId });

			// Broadcast to all clients that a guest connected
			io.emit("guestConnected", { guestId, hostname: guestData.hostname });

			console.log(`Guest registered successfully: ${guestId}`);

			// Update client dashboards with new guest list
			updateGuestList();
		} catch (error) {
			console.error("Error registering guest:", error);
			socket.emit("error", { message: "Error registering guest" });
		}
	});

	// Handle disconnect
	socket.on("disconnect", async () => {
		console.log("Client disconnected:", socket.id);
		const guestId = socket.guestId;

		if (guestId && guests[guestId]) {
			console.log(`Guest disconnected: ${guestId}`);
			// Remove guest from in-memory store
			delete guests[guestId];

			try {
				// Update database status
				const guest = await Guest.findOne({ guestId });
				if (guest) {
					guest.status = "offline";
					guest.lastSeen = new Date();
					await guest.save();
					console.log(`Updated guest status to offline: ${guestId}`);
				}

				// Check if this guest is a computer
				const computer = await Computer.findOne({ guestId });
				if (computer && computer.status === "available") {
					console.log(`Computer guest disconnected: ${guestId}`);
					// Only update status if it's currently available (not being used)
					computer.status = "offline";
					await computer.save();
					console.log(
						`Updated computer status to offline: ${computer.computerName}`
					);
					// Emit computer update
					io.emit("computerUpdated", { computer });
				}

				// Broadcast to all clients that a guest disconnected
				io.emit("guestDisconnected", { guestId });

				// Update client dashboards with new guest list
				updateGuestList();
			} catch (error) {
				console.error("Error updating guest status on disconnect:", error);
			}
		}
	});

	// Function to update all clients with the latest guest list
	async function updateGuestList() {
		try {
			// Get in-memory guests with full details
			const inMemoryGuestIds = Object.keys(guests);

			// Get all registered computers
			const computers = await Computer.find({}).lean();
			const computerGuestIds = computers.map((computer) => computer.guestId);

			// Get guests from database that match our criteria
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
			const dbGuests = await Guest.find({
				$or: [
					{ status: "online" },
					{ guestId: { $in: [...inMemoryGuestIds, ...computerGuestIds] } },
					{ lastSeen: { $gte: fiveMinutesAgo } },
				],
			}).lean();

			// Process guest list as in the API endpoint
			const guestMap = {};

			// Add database guests to the map
			dbGuests.forEach((guest) => {
				const isConnected = inMemoryGuestIds.includes(guest.guestId);
				const inMemoryData = guests[guest.guestId] || {};
				guestMap[guest.guestId] = {
					...guest,
					...inMemoryData,
					status: isConnected ? "online" : "offline",
					lastSeen: isConnected ? new Date() : guest.lastSeen,
				};
			});

			// Add in-memory guests not in DB
			inMemoryGuestIds
				.filter((id) => !guestMap[id])
				.forEach((id) => {
					guestMap[id] = {
						guestId: id,
						status: "online",
						lastSeen: new Date(),
						hostname: guests[id].hostname || "Unknown",
						ipAddress: guests[id].ipAddress || "Unknown",
						osInfo: guests[id].osInfo || "Unknown",
						windowsVersion: guests[id].windowsVersion || "Unknown",
						desktopEnvironment: guests[id].desktopEnvironment || "Unknown",
					};
				});

			// Add computer information
			computers.forEach((computer) => {
				if (!guestMap[computer.guestId]) {
					// Create a minimal guest entry for computers without Guest records
					guestMap[computer.guestId] = {
						guestId: computer.guestId,
						hostname: computer.computerName || "Unknown",
						status: "offline",
						lastSeen: computer.updatedAt || new Date(),
						ipAddress: "Unknown",
						osInfo: "Unknown",
						windowsVersion: "Unknown",
						desktopEnvironment: "Unknown",
					};
				}

				// Add computer information directly to the guest object
				guestMap[computer.guestId].isComputer = true;
				guestMap[computer.guestId].computerStatus = computer.status;
				guestMap[computer.guestId].computerId = computer._id;
				guestMap[computer.guestId].computerName = computer.computerName;
				guestMap[computer.guestId].hourlyRate = computer.hourlyRate;
			});

			// Convert map to array
			const guestsWithComputerInfo = Object.values(guestMap);

			// Emit updated guest list to all clients
			io.emit("guestUpdated", { guests: guestsWithComputerInfo });
		} catch (error) {
			console.error("Error updating guest list:", error);
		}
	}

	// Handle command results from guests
	socket.on("commandResult", async (result) => {
		console.log(
			`Command result received from guest ${result.guestId}:`,
			JSON.stringify(result)
		);

		// Update command log in database
		await safeDbOperation(async () => {
			// Find the most recent command log for this guest and action
			const log = await CommandLog.findOne({
				guestId: result.guestId,
				action: result.action,
			}).sort({ executedAt: -1 });

			if (log) {
				console.log(
					`Found command log to update for ${result.guestId}, action: ${result.action}`
				);
				log.success = result.success;
				log.error = result.error;
				log.completedAt = new Date();

				const savedLog = await log.save();
				console.log(`Updated command log:`, JSON.stringify(savedLog));
			} else {
				console.log(
					`No command log found for ${result.guestId}, action: ${result.action}`
				);
				// Create a new log if one doesn't exist
				const newLog = new CommandLog({
					guestId: result.guestId,
					action: result.action,
					params: result.params || {},
					success: result.success,
					error: result.error,
					executedAt: new Date(),
					completedAt: new Date(),
				});
				await newLog.save();
				console.log(`Created new command log for result`);
			}

			// If this is a password change result, update the password history
			if (result.action === "changePassword" && result.success) {
				// Find the computer for this guest
				const computer = await Computer.findOne({ guestId: result.guestId });
				if (computer) {
					// Create a new password history entry with both username and password
					const passwordHistory = new PasswordChangeHistory({
						computerId: computer._id,
						guestId: result.guestId,
						username: result.params.username || "Administrator", // Default to Administrator if not provided
						password: result.params.newPassword,
						changedBy: "admin",
					});
					await passwordHistory.save();

					// Update computer's lastPasswordChange
					computer.lastPasswordChange = new Date();
					await computer.save();

					console.log(`Password history updated for computer ${computer._id}`);
				}
			}
		}, null);

		// Broadcast the result to admin clients
		io.emit("commandUpdate", result);
	});

	// Handle rental updates
	socket.on("joinRental", async (rentalId) => {
		// Join a room specific to this rental
		socket.join(`rental:${rentalId}`);
		console.log(`Client ${socket.id} joined rental room: rental:${rentalId}`);

		// Send initial rental data
		await safeDbOperation(async () => {
			const rental = await Rental.findById(rentalId)
				.populate("computerId", "computerName")
				.populate("userId", "username");

			if (rental) {
				socket.emit("rentalUpdate", rental);
			}
		}, null);
	});
});

// API endpoint to send commands to guests
app.post("/api/send-command", async (req, res) => {
	const { guestId, commandData } = req.body;
	const guest = guests[guestId];

	console.log(
		`Sending command to guest ${guestId}:`,
		JSON.stringify(commandData)
	);

	// Log the command to database
	await safeDbOperation(async () => {
		const log = new CommandLog({
			guestId,
			action: commandData.action,
			params: commandData.params || {},
			success: false, // Will be updated when result comes back
			executedAt: new Date(),
		});
		await log.save();
		console.log(`Command logged to database: ${commandData.action}`);
	}, null);

	if (guest && guest.id) {
		// Get the socket by ID and emit the command
		try {
			console.log(`Emitting command to socket ID: ${guest.id}`);
			io.to(guest.id).emit("executeCommand", commandData);
			return res.json({ success: true, message: "Command sent successfully" });
		} catch (err) {
			console.error(`Error sending command to guest ${guestId}:`, err);
			return res.status(500).json({
				success: false,
				error: "Error sending command",
				message: err.message,
			});
		}
	} else {
		console.log(`Guest ${guestId} not found in registry`);
		return res.status(404).json({
			success: false,
			error: "Guest not connected",
			message: "The guest is not currently connected to the server.",
		});
	}
});

// API endpoint to get all connected guests
app.get("/api/connected-guests", async (req, res) => {
	try {
		console.log("Fetching connected guests...");

		// Get in-memory guests with full details
		const inMemoryGuestIds = Object.keys(guests);
		console.log("In-memory guest IDs:", inMemoryGuestIds);
		console.log("Full in-memory guests:", guests);

		// First get all registered computers to ensure they are included
		const computers = await Computer.find({}).lean();
		console.log(`Found ${computers.length} computers in database`);
		const computerGuestIds = computers.map((computer) => computer.guestId);

		// Get guests from database that are either online, were recently active, or are registered as computers
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

		// Find all guests that match our criteria
		const dbGuests = await Guest.find({
			$or: [
				{ status: "online" },
				{ guestId: { $in: [...inMemoryGuestIds, ...computerGuestIds] } },
				{ lastSeen: { $gte: fiveMinutesAgo } },
			],
		}).lean();

		console.log("Database guests:", JSON.stringify(dbGuests, null, 2));

		// Update status of guests based on in-memory state
		const updatedGuests = dbGuests.map((guest) => {
			const isConnected = inMemoryGuestIds.includes(guest.guestId);
			const inMemoryData = guests[guest.guestId] || {};
			return {
				...guest,
				...inMemoryData,
				status: isConnected ? "online" : "offline",
				lastSeen: isConnected ? new Date() : guest.lastSeen,
			};
		});

		// Add any in-memory guests that aren't in the database
		const dbGuestIds = dbGuests.map((g) => g.guestId);
		const newGuests = inMemoryGuestIds
			.filter((id) => !dbGuestIds.includes(id))
			.map((id) => ({
				guestId: id,
				status: "online",
				lastSeen: new Date(),
				hostname: guests[id].hostname || "Unknown",
				ipAddress: guests[id].ipAddress || "Unknown",
				osInfo: guests[id].osInfo || "Unknown",
				windowsVersion: guests[id].windowsVersion || "Unknown",
				desktopEnvironment: guests[id].desktopEnvironment || "Unknown",
			}));

		// Create a map of all guests for easier lookup
		const guestMap = {};

		// Add database guests to the map
		updatedGuests.forEach((guest) => {
			guestMap[guest.guestId] = guest;
		});

		// Add in-memory guests not in DB to the map
		newGuests.forEach((guest) => {
			guestMap[guest.guestId] = guest;
		});

		// Ensure all computers have an entry, even if there's no Guest record
		computers.forEach((computer) => {
			if (!guestMap[computer.guestId]) {
				// Create a minimal guest entry for computers without Guest records
				guestMap[computer.guestId] = {
					guestId: computer.guestId,
					hostname: computer.computerName || "Unknown",
					status: "offline",
					lastSeen: computer.updatedAt || new Date(),
					ipAddress: "Unknown",
					osInfo: "Unknown",
					windowsVersion: "Unknown",
					desktopEnvironment: "Unknown",
				};
			}

			// Add computer information directly to the guest object
			guestMap[computer.guestId].isComputer = true;
			guestMap[computer.guestId].computerStatus = computer.status;
			guestMap[computer.guestId].computerId = computer._id;
			guestMap[computer.guestId].computerName = computer.computerName;
			guestMap[computer.guestId].hourlyRate = computer.hourlyRate;
		});

		// Convert map to array
		const guestsWithComputerInfo = Object.values(guestMap);

		console.log(
			"Final guest list:",
			JSON.stringify(guestsWithComputerInfo, null, 2)
		);

		// Return guest data
		res.json({
			guests: guestsWithComputerInfo,
		});
	} catch (error) {
		console.error("Error fetching connected guests:", error);
		res.status(500).json({ message: "Server error" });
	}
});

// Function to check for expired rentals and update them
async function checkExpiredRentals() {
	if (!isMongoConnected) return;

	try {
		console.log("Checking for expired rentals...");
		const now = new Date();

		// Find active rentals that have expired
		const expiredRentals = await Rental.find({
			status: "active",
			endTime: { $lte: now },
		});

		console.log(`Found ${expiredRentals.length} expired rentals`);

		// Process each expired rental
		for (const rental of expiredRentals) {
			console.log(`Processing expired rental: ${rental._id}`);

			// Update rental status
			rental.status = "expired";
			await rental.save();

			// Update computer status
			const computer = await Computer.findById(rental.computerId);
			if (computer) {
				computer.status = "available";
				computer.currentUser = null;
				computer.isRented = false; // Set isRented to false when rental expires
				await computer.save();

				// Generate a new password
				const newPassword = Math.random().toString(36).slice(-8);

				// Create password history entry
				const passwordHistory = new PasswordChangeHistory({
					computerId: computer._id,
					guestId: computer.guestId,
					password: newPassword,
					changedBy: "rental",
					rentalId: rental._id,
				});

				await passwordHistory.save();

				// Send command to change password and lock computer
				const guest = guests[computer.guestId];
				if (guest && guest.id) {
					// Change password command
					io.to(guest.id).emit("executeCommand", {
						action: "changePassword",
						params: { newPassword },
					});

					// Lock computer command
					setTimeout(() => {
						io.to(guest.id).emit("executeCommand", {
							action: "lockComputer",
						});
					}, 5000); // Wait 5 seconds before locking
				}

				// Notify clients about the rental expiration
				io.to(`rental:${rental._id}`).emit("rentalExpired", {
					rentalId: rental._id,
				});
				io.emit("computerUpdate", {
					computerId: computer._id,
					status: "available",
					isRented: false,
				});
			}
		}
	} catch (error) {
		console.error("Error checking expired rentals:", error);
	}
}

// Function to check for inactive computers and update their status
async function checkInactiveComputers() {
	if (!isMongoConnected) return;

	try {
		console.log("Checking for inactive computers...");

		// Define the inactive threshold (10 minutes)
		const inactiveThreshold = new Date(Date.now() - 10 * 60 * 1000);

		// Find all computers with status "available"
		const computers = await Computer.find({ status: "available" });

		console.log(`Found ${computers.length} computers to check for inactivity`);
		let inactiveCount = 0;

		// Process each computer
		for (const computer of computers) {
			// Find the corresponding guest
			const guest = await Guest.findOne({ guestId: computer.guestId });

			if (guest) {
				// Check if the guest is inactive (last seen before the threshold)
				const isInactive = new Date(guest.lastSeen) < inactiveThreshold;
				const isConnected = guests[guest.guestId] !== undefined;

				// If inactive and not connected, mark as unavailable
				if (isInactive && !isConnected && computer.status === "available") {
					console.log(
						`Computer ${computer._id} (guest: ${computer.guestId}) is inactive, marking as unavailable`
					);
					computer.status = "unavailable";
					await computer.save();
					inactiveCount++;

					// Notify clients about the computer status change
					io.emit("computerUpdate", {
						computerId: computer._id,
						status: "unavailable",
					});
				}
				// If computer is unavailable but the guest is now active, mark as available
				else if (
					computer.status === "unavailable" &&
					(isConnected || (!isInactive && guest.status === "online"))
				) {
					console.log(
						`Computer ${computer._id} (guest: ${computer.guestId}) is active again, marking as available`
					);
					computer.status = "available";
					await computer.save();

					// Notify clients about the computer status change
					io.emit("computerUpdate", {
						computerId: computer._id,
						status: "available",
					});
				}
			}
		}

		console.log(
			`Updated ${inactiveCount} inactive computers to unavailable status`
		);
	} catch (error) {
		console.error("Error checking inactive computers:", error);
	}
}

// Start the periodic checks when the server starts
let rentalCheckInterval;
let computerStatusCheckInterval;

if (isMongoConnected) {
	// Check rentals every 1 minute
	rentalCheckInterval = setInterval(checkExpiredRentals, 60 * 1000);

	// Check computer activity status every 2 minutes
	computerStatusCheckInterval = setInterval(
		checkInactiveComputers,
		2 * 60 * 1000
	);

	// Run initial checks
	checkExpiredRentals();
	checkInactiveComputers();
}
