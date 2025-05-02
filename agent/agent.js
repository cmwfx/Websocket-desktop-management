const { io } = require("socket.io-client");
const os = require("os");
const { exec } = require("child_process");
const dotenv = require("dotenv");
const https = require("https");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

// Load environment variables
dotenv.config();

// Configuration - hardcode the Heroku URL to ensure it works
const SERVER_URL = "https://desktop-managemt-8dd667cf9f90.herokuapp.com";
const GUEST_ID_FILE = path.join(__dirname, ".guest-id");

// Function to generate a consistent guest ID based on machine characteristics
function generateGuestId() {
	const hostname = os.hostname();
	const ipAddresses = Object.values(os.networkInterfaces())
		.flat()
		.filter((details) => details.family === "IPv4" && !details.internal)
		.map((details) => details.address);
	const ipAddress = ipAddresses.length > 0 ? ipAddresses[0] : "unknown";
	const macAddresses = Object.values(os.networkInterfaces())
		.flat()
		.filter((details) => details.family === "IPv4" && !details.internal)
		.map((details) => details.mac)
		.filter((mac) => mac !== "00:00:00:00:00:00");
	const macAddress = macAddresses.length > 0 ? macAddresses[0] : "unknown";

	// Create a unique string combining hardware identifiers
	const uniqueString = `${hostname}-${macAddress}-${os.cpus()[0].model}`;

	// Generate a hash of the unique string
	const hash = crypto.createHash("sha256").update(uniqueString).digest("hex");

	// Return a shorter, more manageable ID
	return `guest-${hash.substring(0, 8)}`;
}

// Function to load or create guest ID
function getGuestId() {
	try {
		// Try to read existing guest ID
		if (fs.existsSync(GUEST_ID_FILE)) {
			return fs.readFileSync(GUEST_ID_FILE, "utf8").trim();
		}
	} catch (error) {
		console.error("Error reading guest ID file:", error.message);
	}

	// Generate new guest ID if none exists
	const newGuestId = generateGuestId();
	try {
		fs.writeFileSync(GUEST_ID_FILE, newGuestId);
	} catch (error) {
		console.error("Error writing guest ID file:", error.message);
	}
	return newGuestId;
}

// Get the guest ID
const GUEST_ID = getGuestId();

// Test HTTP connectivity to the server
const serverUrl = new URL(SERVER_URL);

// Create appropriate request options
const options = {
	hostname: serverUrl.hostname,
	path: "/api/connected-guests",
	method: "GET",
	rejectUnauthorized: false, // Allow self-signed certificates
};

// Use the appropriate protocol module
const req = https.request(options, (res) => {
	let data = "";

	res.on("data", (chunk) => {
		data += chunk;
	});

	res.on("end", () => {
		if (res.statusCode !== 200) {
			console.error(
				`HTTP connectivity test failed with status ${res.statusCode}`
			);
		}
	});
});

req.on("error", (error) => {
	console.error("HTTP Request Error:", error.message);
	console.error(
		"This may indicate network connectivity issues or server unavailability."
	);
});

req.end();

// Get system information
const hostname = os.hostname();
const ipAddresses = Object.values(os.networkInterfaces())
	.flat()
	.filter((details) => details.family === "IPv4" && !details.internal)
	.map((details) => details.address);
const ipAddress = ipAddresses.length > 0 ? ipAddresses[0] : "unknown";
const osInfo = `${os.type()} ${os.release()} (${os.arch()})`;

// Get Windows-specific information
let windowsVersion = "Unknown";
try {
	const { stdout } = require("child_process").execSync(
		'systeminfo | findstr /B /C:"OS Version"'
	);
	windowsVersion = stdout.toString().trim();
} catch (error) {
	console.error("Error getting Windows version:", error.message);
}

// Add a delay before connecting to ensure all network interfaces are properly initialized
setTimeout(initializeSocketConnection, 5000);

// Socket.IO connection and event handlers
let socket;

function initializeSocketConnection() {
	// Create socket connection with robust options
	socket = io(SERVER_URL, {
		reconnectionAttempts: Infinity,
		reconnectionDelay: 5000,
		timeout: 30000,
		transports: ["websocket", "polling"],
		extraHeaders: {
			"User-Agent": `Desktop-Management-Agent/${GUEST_ID}`,
		},
		forceNew: true,
		secure: true,
		rejectUnauthorized: false, // Allow self-signed certificates
	});

	// Handle connection events
	socket.on("connect", () => {
		// Register with the server
		const registrationData = {
			guestId: GUEST_ID,
			hostname,
			ipAddress,
			osInfo,
			windowsVersion,
		};

		socket.emit("register", registrationData);
	});

	socket.on("connect_error", (error) => {
		console.error("Connection error:", error.message);
		console.error("Error details:", error);
	});

	socket.on("connect_timeout", () => {
		console.error("Connection timeout");
	});

	socket.on("error", (error) => {
		console.error("Socket error:", error);
	});

	// Handle command execution
	socket.on("executeCommand", (data) => {
		switch (data.action) {
			case "changePassword":
				changePassword(data);
				break;
			case "lockComputer":
				lockComputer();
				break;
			case "shutdown":
				shutdownComputer();
				break;
			case "restart":
				restartComputer();
				break;
			default:
				socket.emit("commandResult", {
					guestId: GUEST_ID,
					action: data.action,
					success: false,
					error: "Unknown command",
				});
		}
	});

	// Handle disconnection
	socket.on("disconnect", () => {
		// Try to reconnect
		setTimeout(() => {
			socket.connect();
		}, 5000);
	});
}

// Command implementations
function changePassword(data) {
	if (!socket) {
		console.error("Socket not initialized");
		return;
	}

	const { username, newPassword } = data;

	if (!username || !newPassword) {
		socket.emit("commandResult", {
			guestId: GUEST_ID,
			action: "changePassword",
			success: false,
			error: "Username and new password are required",
		});
		return;
	}

	// Windows command to change password
	const command = `net user ${username} ${newPassword}`;

	exec(command, (error, stdout, stderr) => {
		if (error) {
			console.error(`Error changing password: ${error.message}`);
			socket.emit("commandResult", {
				guestId: GUEST_ID,
				action: "changePassword",
				success: false,
				error: error.message,
			});
			return;
		}

		socket.emit("commandResult", {
			guestId: GUEST_ID,
			action: "changePassword",
			success: true,
			params: { username },
		});
	});
}

function lockComputer() {
	if (!socket) {
		console.error("Socket not initialized");
		return;
	}

	// Windows command to lock the computer
	const command = "rundll32.exe user32.dll,LockWorkStation";

	exec(command, (error, stdout, stderr) => {
		if (error) {
			console.error(`Error locking computer: ${error.message}`);
			socket.emit("commandResult", {
				guestId: GUEST_ID,
				action: "lockComputer",
				success: false,
				error: error.message,
			});
			return;
		}

		socket.emit("commandResult", {
			guestId: GUEST_ID,
			action: "lockComputer",
			success: true,
		});
	});
}

function shutdownComputer() {
	if (!socket) {
		console.error("Socket not initialized");
		return;
	}

	// Windows command to shutdown with a delay to allow the command result to be sent
	const command = 'shutdown /s /t 10 /c "Remote shutdown initiated"';

	exec(command, (error, stdout, stderr) => {
		if (error) {
			console.error(`Error shutting down computer: ${error.message}`);
			socket.emit("commandResult", {
				guestId: GUEST_ID,
				action: "shutdown",
				success: false,
				error: error.message,
			});
			return;
		}

		socket.emit("commandResult", {
			guestId: GUEST_ID,
			action: "shutdown",
			success: true,
		});
	});
}

function restartComputer() {
	if (!socket) {
		console.error("Socket not initialized");
		return;
	}

	// Windows command to restart with a delay to allow the command result to be sent
	const command = 'shutdown /r /t 10 /c "Remote restart initiated"';

	exec(command, (error, stdout, stderr) => {
		if (error) {
			console.error(`Error restarting computer: ${error.message}`);
			socket.emit("commandResult", {
				guestId: GUEST_ID,
				action: "restart",
				success: false,
				error: error.message,
			});
			return;
		}

		socket.emit("commandResult", {
			guestId: GUEST_ID,
			action: "restart",
			success: true,
		});
	});
}

// Handle process termination
process.on("SIGINT", () => {
	if (socket) {
		socket.disconnect();
	}
	process.exit(0);
});
