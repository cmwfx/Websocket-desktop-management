const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { ServerApiVersion } = require("mongodb");

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
async function safeDbOperation(operation, fallback) {
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

// Helper function to get full guest list
async function getFullGuestList() {
	try {
		const fullGuests = await Guest.find({
			$or: [{ status: "online" }, { guestId: { $in: Object.keys(guests) } }],
		}).lean();

		const guestList = fullGuests.map((g) => ({
			...g,
			status: Object.keys(guests).includes(g.guestId) ? "online" : "offline",
			lastSeen: Object.keys(guests).includes(g.guestId)
				? new Date()
				: g.lastSeen,
		}));

		return guestList;
	} catch (error) {
		console.error("Error getting full guest list:", error);
		// Fallback to in-memory guests
		return Object.keys(guests).map((id) => ({
			guestId: id,
			status: "online",
			lastSeen: new Date(),
			hostname: guests[id].hostname || "Unknown",
			ipAddress: guests[id].ipAddress || "Unknown",
			osInfo: guests[id].osInfo || "Unknown",
			windowsVersion: guests[id].windowsVersion || "Unknown",
			desktopEnvironment: guests[id].desktopEnvironment || "Unknown",
		}));
	}
}

// Socket.IO connection handling
io.on("connection", (socket) => {
	console.log("New client connected:", socket.id);

	// Handle guest registration
	socket.on("register", async (data) => {
		const {
			guestId,
			hostname,
			ipAddress,
			osInfo,
			windowsVersion,
			desktopEnvironment,
		} = data;

		console.log(
			`Guest registration received for IP: ${ipAddress}`,
			JSON.stringify(data, null, 2)
		);

		try {
			// Look for existing guest with this IP
			let guest = await Guest.findOne({ ipAddress });
			let existingGuestId = null;

			if (guest) {
				// Update existing guest
				existingGuestId = guest.guestId;
				console.log(`Found existing guest with IP ${ipAddress}, updating...`);

				guest.hostname = hostname || guest.hostname;
				guest.osInfo = osInfo || guest.osInfo;
				guest.windowsVersion = windowsVersion || guest.windowsVersion;
				guest.desktopEnvironment =
					desktopEnvironment || guest.desktopEnvironment;
				guest.status = "online";
				guest.lastSeen = new Date();

				await guest.save();
				console.log(`Updated existing guest: ${guest.guestId}`);
			} else {
				// Create new guest
				console.log(
					`No existing guest found for IP ${ipAddress}, creating new...`
				);
				guest = new Guest({
					guestId,
					hostname,
					ipAddress,
					osInfo,
					windowsVersion,
					desktopEnvironment,
					status: "online",
					lastSeen: new Date(),
				});

				await guest.save();
				console.log(`Created new guest: ${guest.guestId}`);
			}

			// Store socket connection with guest details
			guests[guest.guestId] = {
				id: socket.id,
				hostname,
				ipAddress,
				osInfo,
				windowsVersion,
				desktopEnvironment,
				registeredAt: new Date(),
				lastSeen: new Date(),
				status: "online",
			};

			// If this was an existing guest with a different ID, clean up old reference
			if (existingGuestId && existingGuestId !== guest.guestId) {
				delete guests[existingGuestId];
			}

			console.log(`Updated in-memory guests registry`);

			// Get and emit the full guest list
			const guestList = await getFullGuestList();
			io.emit("guestUpdate", guestList);

			// Check if this guest is registered as a computer
			const computer = await Computer.findOne({ guestId: guest.guestId });
			if (computer) {
				console.log(`Guest ${guest.guestId} is registered as a computer`);
				io.emit("computerUpdate", {
					computerId: computer._id,
					status: "online",
				});
			}
		} catch (error) {
			console.error("Error handling guest registration:", error);
			// Even if DB operations fail, maintain socket connection in memory
			guests[guestId] = {
				id: socket.id,
				hostname,
				ipAddress,
				osInfo,
				windowsVersion,
				desktopEnvironment,
				registeredAt: new Date(),
				lastSeen: new Date(),
				status: "online",
			};
		}
	});

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
					// Create a new password history entry
					const passwordHistory = new PasswordChangeHistory({
						computerId: computer._id,
						guestId: result.guestId,
						password: result.params.newPassword,
						changedBy: "system",
					});
					await passwordHistory.save();
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

	// Handle disconnection
	socket.on("disconnect", async () => {
		// Find and remove the disconnected guest
		for (const [id, s] of Object.entries(guests)) {
			if (s.id === socket.id) {
				delete guests[id];
				console.log(`Guest ${id} disconnected from socket`);

				// Update guest status in database
				await safeDbOperation(async () => {
					console.log(`Looking for disconnected guest in database: ${id}`);
					const guest = await Guest.findOne({ guestId: id });

					if (guest) {
						console.log(`Found disconnected guest in database: ${id}`);
						guest.status = "offline";
						guest.lastSeen = new Date();

						const savedGuest = await guest.save();
						console.log(
							`Updated guest status to offline in database: ${id}`,
							JSON.stringify(savedGuest.toObject(), null, 2)
						);

						// Get and emit the full guest list
						const guestList = await getFullGuestList();
						io.emit("guestUpdate", guestList);
					} else {
						console.log(`Guest ${id} not found in database`);
					}
				}, null);
				break;
			}
		}
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

		// Get guests from database
		const dbGuests = await Guest.find({
			$or: [{ status: "online" }, { guestId: { $in: inMemoryGuestIds } }],
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

		const allGuests = [...updatedGuests, ...newGuests];
		console.log("Final guest list:", JSON.stringify(allGuests, null, 2));

		// Ensure all required fields are present
		const sanitizedGuests = allGuests.map((guest) => ({
			guestId: guest.guestId,
			status: guest.status || "unknown",
			lastSeen: guest.lastSeen || new Date(),
			hostname: guest.hostname || "Unknown",
			ipAddress: guest.ipAddress || "Unknown",
			osInfo: guest.osInfo || "Unknown",
			windowsVersion: guest.windowsVersion || "Unknown",
			desktopEnvironment: guest.desktopEnvironment || "Unknown",
		}));

		res.json({ guests: sanitizedGuests });
	} catch (error) {
		console.error("Error fetching guests:", error);
		// On error, return at least the in-memory guests with full details
		const fallbackGuests = Object.keys(guests).map((id) => ({
			guestId: id,
			status: "online",
			lastSeen: new Date(),
			hostname: guests[id].hostname || "Unknown",
			ipAddress: guests[id].ipAddress || "Unknown",
			osInfo: guests[id].osInfo || "Unknown",
			windowsVersion: guests[id].windowsVersion || "Unknown",
			desktopEnvironment: guests[id].desktopEnvironment || "Unknown",
		}));
		console.log(
			"Returning fallback guests:",
			JSON.stringify(fallbackGuests, null, 2)
		);
		res.json({ guests: fallbackGuests });
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
				});
			}
		}
	} catch (error) {
		console.error("Error checking expired rentals:", error);
	}
}

// Set up a periodic check for expired rentals
setInterval(checkExpiredRentals, 60000); // Check every minute

// Run an initial check when the server starts
setTimeout(checkExpiredRentals, 10000); // Wait 10 seconds after server start
