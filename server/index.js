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

// Import models
const Guest = require("./models/Guest");
const CommandLog = require("./models/CommandLog");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from the React app in production
if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "../client/build")));

	// Handle React routing, return all requests to React app
	app.get("*", function (req, res) {
		res.sendFile(path.join(__dirname, "../client/build", "index.html"));
	});
}

// Routes
app.use("/api/guests", guestRoutes);
app.use("/api/commands", commandRoutes);

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
			`Guest registration received: ${guestId}`,
			JSON.stringify(data)
		);

		// Store the socket connection
		guests[guestId] = {
			id: socket.id,
			hostname,
			ipAddress,
			osInfo,
			windowsVersion,
			desktopEnvironment,
			registeredAt: new Date(),
		};

		// Update or create guest in database
		await safeDbOperation(async () => {
			console.log(`Looking for guest in database: ${guestId}`);
			let guest = await Guest.findOne({ guestId });

			if (guest) {
				console.log(`Found existing guest in database: ${guestId}`);
				// Update existing guest
				guest.status = "online";
				guest.lastSeen = new Date();
				guest.hostname = hostname || guest.hostname;
				guest.ipAddress = ipAddress || guest.ipAddress;
				guest.osInfo = osInfo || guest.osInfo;
				guest.windowsVersion = windowsVersion || guest.windowsVersion;
				guest.desktopEnvironment =
					desktopEnvironment || guest.desktopEnvironment;

				const savedGuest = await guest.save();
				console.log(
					`Updated existing guest in database: ${guestId}`,
					JSON.stringify(savedGuest)
				);
			} else {
				console.log(`Creating new guest in database: ${guestId}`);
				// Create new guest
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

				const savedGuest = await guest.save();
				console.log(
					`Created new guest in database: ${guestId}`,
					JSON.stringify(savedGuest)
				);
			}

			// Verify the guest was saved correctly
			const verifyGuest = await Guest.findOne({ guestId });
			console.log(
				`Verification - Guest in database after registration:`,
				JSON.stringify(verifyGuest)
			);
		}, null);

		// Notify all admin clients about the new guest
		io.emit("guestUpdate", Object.keys(guests));
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
		}, null);

		// Broadcast the result to admin clients
		io.emit("commandUpdate", result);
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
							JSON.stringify(savedGuest)
						);

						// Verify the update
						const verifyGuest = await Guest.findOne({ guestId: id });
						console.log(
							`Verification - Disconnected guest in database:`,
							JSON.stringify(verifyGuest)
						);
					} else {
						console.log(`Guest ${id} not found in database`);
					}
				}, null);

				// Notify all admin clients about the guest disconnection
				io.emit("guestUpdate", Object.keys(guests));
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

		// Get in-memory guests
		const inMemoryGuestIds = Object.keys(guests);
		console.log("In-memory guest IDs:", inMemoryGuestIds);

		// Get guests from database
		const dbGuests = await Guest.find({
			$or: [{ status: "online" }, { guestId: { $in: inMemoryGuestIds } }],
		});
		console.log("Database guests:", dbGuests);

		// Update status of guests based on in-memory state
		const updatedGuests = dbGuests.map((guest) => {
			const isConnected = inMemoryGuestIds.includes(guest.guestId);
			return {
				...guest.toObject(),
				status: isConnected ? "online" : "offline",
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
			}));

		const allGuests = [...updatedGuests, ...newGuests];
		console.log("Returning all guests:", allGuests);

		res.json({ guests: allGuests });
	} catch (error) {
		console.error("Error fetching guests:", error);
		// On error, return at least the in-memory guests
		const fallbackGuests = Object.keys(guests).map((id) => ({
			guestId: id,
			status: "online",
			lastSeen: new Date(),
		}));
		res.json({ guests: fallbackGuests });
	}
});
