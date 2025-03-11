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
	console.log("API call: /api/connected-guests");

	// In-memory guests are the source of truth when database is unavailable
	const memoryGuestIds = Object.keys(guests);
	console.log("In-memory guests:", memoryGuestIds);

	// If MongoDB is not connected, return just the in-memory guests
	if (!isMongoConnected) {
		console.log("MongoDB not connected, returning only in-memory guests");
		return res.json({ guests: memoryGuestIds });
	}

	try {
		// Get all guests that are marked as online from the database
		console.log("Querying database for online guests...");
		const onlineGuests = await Guest.find({ status: "online" });
		console.log("Database query result:", JSON.stringify(onlineGuests));

		// Extract guestIds from the database results
		const dbGuestIds = onlineGuests.map((guest) => guest.guestId);
		console.log("Guest IDs from database:", dbGuestIds);

		// Find guests that are in memory but not marked as online in the database
		// These need to be updated in the database
		const guestsToUpdate = memoryGuestIds.filter(
			(id) => !dbGuestIds.includes(id)
		);

		if (guestsToUpdate.length > 0) {
			console.log(
				"Updating status for guests that are connected but not marked online:",
				guestsToUpdate
			);

			// Update these guests in the database
			for (const guestId of guestsToUpdate) {
				try {
					let guest = await Guest.findOne({ guestId });

					if (guest) {
						// Update existing guest
						guest.status = "online";
						guest.lastSeen = new Date();
						await guest.save();
						console.log(`Updated guest status to online: ${guestId}`);
					} else {
						// This should not happen often, but create a minimal record if needed
						const guestInfo = guests[guestId];
						guest = new Guest({
							guestId,
							hostname: guestInfo.hostname || "Unknown",
							ipAddress: guestInfo.ipAddress || "0.0.0.0",
							osInfo: guestInfo.osInfo || "Unknown",
							windowsVersion: guestInfo.windowsVersion || "Unknown",
							desktopEnvironment: guestInfo.desktopEnvironment || "Unknown",
							status: "online",
							lastSeen: new Date(),
						});
						await guest.save();
						console.log(`Created missing guest record in database: ${guestId}`);
					}
				} catch (err) {
					console.error(`Error updating guest ${guestId}:`, err);
				}
			}
		}

		// Find guests that are marked as online in the database but not in memory
		// These need to be marked as offline in the database
		const guestsToMarkOffline = dbGuestIds.filter(
			(id) => !memoryGuestIds.includes(id)
		);

		if (guestsToMarkOffline.length > 0) {
			console.log(
				"Marking guests as offline that are not connected:",
				guestsToMarkOffline
			);

			// Update these guests in the database
			for (const guestId of guestsToMarkOffline) {
				try {
					const guest = await Guest.findOne({ guestId });
					if (guest) {
						guest.status = "offline";
						guest.lastSeen = new Date();
						await guest.save();
						console.log(`Updated guest status to offline: ${guestId}`);
					}
				} catch (err) {
					console.error(`Error updating guest ${guestId}:`, err);
				}
			}
		}

		// After synchronization, the in-memory guests are the source of truth
		console.log("Returning connected guests:", memoryGuestIds);
		return res.json({ guests: memoryGuestIds });
	} catch (err) {
		console.error("Error fetching connected guests:", err);
		return res.status(500).json({
			error: "Error fetching connected guests",
			message: err.message,
			guests: memoryGuestIds, // Fallback to in-memory guests
		});
	}
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
