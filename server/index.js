const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

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
		const { guestId, hostname, ipAddress, osInfo, desktopEnvironment } = data;
		guests[guestId] = socket;
		console.log(`Guest registered: ${guestId}`);

		// Update or create guest in database
		try {
			let guest = await Guest.findOne({ guestId });

			if (guest) {
				guest.status = "online";
				guest.lastSeen = new Date();
				guest.hostname = hostname || guest.hostname;
				guest.ipAddress = ipAddress || guest.ipAddress;
				guest.osInfo = osInfo || guest.osInfo;
				guest.desktopEnvironment =
					desktopEnvironment || guest.desktopEnvironment;
				await guest.save();
			} else {
				guest = new Guest({
					guestId,
					hostname,
					ipAddress,
					osInfo,
					desktopEnvironment,
					status: "online",
				});
				await guest.save();
			}
		} catch (err) {
			console.error("Error updating guest in database:", err);
		}

		// Notify all admin clients about the new guest
		io.emit("guestUpdate", Object.keys(guests));
	});

	// Handle command results from guests
	socket.on("commandResult", async (result) => {
		console.log("Command result received:", result);

		// Log the command result to database
		try {
			const log = new CommandLog({
				guestId: result.guestId,
				action: result.action,
				params: result.params || {},
				success: result.success,
				error: result.error,
			});
			await log.save();
		} catch (err) {
			console.error("Error logging command result:", err);
		}

		// Broadcast the result to admin clients
		io.emit("commandUpdate", result);
	});

	// Handle disconnection
	socket.on("disconnect", async () => {
		// Find and remove the disconnected guest
		for (const [id, s] of Object.entries(guests)) {
			if (s.id === socket.id) {
				delete guests[id];
				console.log(`Guest ${id} disconnected`);

				// Update guest status in database
				try {
					const guest = await Guest.findOne({ guestId: id });
					if (guest) {
						guest.status = "offline";
						guest.lastSeen = new Date();
						await guest.save();
					}
				} catch (err) {
					console.error("Error updating guest status:", err);
				}

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
	const guestSocket = guests[guestId];

	// Log the command to database
	try {
		const log = new CommandLog({
			guestId,
			action: commandData.action,
			params: commandData.params || {},
			success: false, // Will be updated when result comes back
			executedAt: new Date(),
		});
		await log.save();
	} catch (err) {
		console.error("Error logging command:", err);
	}

	if (guestSocket) {
		guestSocket.emit("executeCommand", commandData);
		return res.json({ success: true, message: "Command sent successfully" });
	} else {
		return res
			.status(404)
			.json({ success: false, error: "Guest not connected" });
	}
});

// API endpoint to get all connected guests
app.get("/api/connected-guests", (req, res) => {
	return res.json({ guests: Object.keys(guests) });
});

// MongoDB Connection
mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => console.log("Connected to MongoDB"))
	.catch((err) => console.error("MongoDB connection error:", err));

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
