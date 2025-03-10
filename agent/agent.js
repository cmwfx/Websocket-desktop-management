const { io } = require("socket.io-client");
const os = require("os");
const { exec } = require("child_process");
const dotenv = require("dotenv");
const fs = require("fs");
const https = require("https");

// Load environment variables
dotenv.config();

// Configuration - hardcode the Heroku URL to ensure it works
const SERVER_URL = "https://desktop-managemt-8dd667cf9f90.herokuapp.com";
const GUEST_ID = `guest-${Math.floor(Math.random() * 10000)}`; // Generate a random guest ID

console.log(`Using server URL: ${SERVER_URL}`);

// Test HTTP connectivity to the server
console.log(`Testing HTTP connectivity to ${SERVER_URL}...`);
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
	console.log(`HTTP Status: ${res.statusCode}`);
	let data = "";

	res.on("data", (chunk) => {
		data += chunk;
	});

	res.on("end", () => {
		console.log("Response data:", data);
		if (res.statusCode === 200) {
			console.log("HTTP connectivity test successful!");
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

// Detect Linux desktop environment
let desktopEnvironment = "unknown";
if (os.type() === "Linux") {
	try {
		// Check environment variables that might indicate the desktop environment
		if (process.env.XDG_CURRENT_DESKTOP) {
			desktopEnvironment = process.env.XDG_CURRENT_DESKTOP;
		} else if (process.env.DESKTOP_SESSION) {
			desktopEnvironment = process.env.DESKTOP_SESSION;
		} else if (process.env.GNOME_DESKTOP_SESSION_ID) {
			desktopEnvironment = "GNOME";
		} else if (process.env.KDE_FULL_SESSION) {
			desktopEnvironment = "KDE";
		}
	} catch (error) {
		console.error("Error detecting desktop environment:", error);
	}
}

console.log(`Starting agent with ID: ${GUEST_ID}`);
console.log(`Hostname: ${hostname}`);
console.log(`IP Address: ${ipAddress}`);
console.log(`OS: ${osInfo}`);
console.log(`Desktop Environment: ${desktopEnvironment}`);

// Add a delay before connecting to ensure all network interfaces are properly initialized
console.log("Waiting 5 seconds before connecting to server...");
setTimeout(initializeSocketConnection, 5000);

// Socket.IO connection and event handlers
let socket;

function initializeSocketConnection() {
	console.log(`Attempting to connect to server at: ${SERVER_URL}`);

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
		console.log("Connected to server successfully");

		// Register with the server
		const registrationData = {
			guestId: GUEST_ID,
			hostname,
			ipAddress,
			osInfo,
			desktopEnvironment,
		};

		console.log("Sending registration data:", JSON.stringify(registrationData));
		socket.emit("register", registrationData);
		console.log("Registration data sent to server");
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
		console.log("Received command:", data);

		switch (data.action) {
			case "changePassword":
				changePassword(data);
				break;
			case "lockComputer":
				lockComputer();
				break;
			case "unlockComputer":
				unlockComputer();
				break;
			case "shutdown":
				shutdownComputer();
				break;
			case "restart":
				restartComputer();
				break;
			default:
				console.log(`Unknown command: ${data.action}`);
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
		console.log("Disconnected from server");

		// Try to reconnect
		setTimeout(() => {
			console.log("Attempting to reconnect...");
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

	// Linux command to change password
	const command = `echo "${username}:${newPassword}" | sudo chpasswd`;

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

		console.log(`Password changed for user ${username}`);
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

	// Linux command to lock the screen based on desktop environment
	let command = "";

	// Select the appropriate command based on the detected desktop environment
	if (desktopEnvironment.includes("GNOME")) {
		command = "gnome-screensaver-command --lock";
	} else if (desktopEnvironment.includes("KDE")) {
		command = "qdbus org.kde.screensaver /ScreenSaver Lock";
	} else if (desktopEnvironment.includes("XFCE")) {
		command = "xflock4";
	} else if (desktopEnvironment.includes("MATE")) {
		command = "mate-screensaver-command --lock";
	} else if (desktopEnvironment.includes("Cinnamon")) {
		command = "cinnamon-screensaver-command --lock";
	} else {
		// Try generic commands if desktop environment is unknown
		const commands = [
			"xdg-screensaver lock", // Generic for most Linux DEs
			"loginctl lock-session", // systemd
			"gnome-screensaver-command --lock", // GNOME
			"qdbus org.kde.screensaver /ScreenSaver Lock", // KDE
			"xflock4", // XFCE
			"i3lock", // i3
			"slock", // Simple X display locker
		];

		// Try each command until one succeeds
		const tryLock = (index) => {
			if (index >= commands.length) {
				socket.emit("commandResult", {
					guestId: GUEST_ID,
					action: "lockComputer",
					success: false,
					error: "Could not find a working lock command for this system",
				});
				return;
			}

			exec(commands[index], (error, stdout, stderr) => {
				if (error) {
					console.log(`Command ${commands[index]} failed, trying next...`);
					tryLock(index + 1);
				} else {
					console.log("Computer locked");
					socket.emit("commandResult", {
						guestId: GUEST_ID,
						action: "lockComputer",
						success: true,
					});
				}
			});
		};

		tryLock(0);
		return;
	}

	// Execute the command for the detected desktop environment
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

		console.log("Computer locked");
		socket.emit("commandResult", {
			guestId: GUEST_ID,
			action: "lockComputer",
			success: true,
		});
	});
}

function unlockComputer() {
	if (!socket) {
		console.error("Socket not initialized");
		return;
	}

	// Note: Unlocking a computer programmatically is more complex and may require additional tools
	console.log("Unlock computer command received, but not implemented");
	socket.emit("commandResult", {
		guestId: GUEST_ID,
		action: "unlockComputer",
		success: false,
		error: "Unlocking not implemented in Linux agent",
	});
}

function shutdownComputer() {
	if (!socket) {
		console.error("Socket not initialized");
		return;
	}

	// Linux command to shutdown
	const command = "sudo shutdown -h +1 'Remote shutdown initiated'";

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

		console.log("Computer shutting down in 1 minute");
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

	// Linux command to restart
	const command = "sudo shutdown -r +1 'Remote restart initiated'";

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

		console.log("Computer restarting in 1 minute");
		socket.emit("commandResult", {
			guestId: GUEST_ID,
			action: "restart",
			success: true,
		});
	});
}

// Handle process termination
process.on("SIGINT", () => {
	console.log("Agent shutting down...");
	if (socket) {
		socket.disconnect();
	}
	process.exit(0);
});
