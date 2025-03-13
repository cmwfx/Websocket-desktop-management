console.log("Starting environment check...");
const dotenv = require("dotenv");
console.log("Dotenv loaded:", dotenv ? "Yes" : "No");

const result = dotenv.config();
console.log(
	"Dotenv config result:",
	result.error ? `Error: ${result.error.message}` : "Success"
);

console.log("\nEnvironment variables:");
console.log("PORT:", process.env.PORT || "Not set");
console.log(
	"MONGODB_URI:",
	process.env.MONGODB_URI ? "Set (not showing for security)" : "Not set"
);
console.log(
	"JWT_SECRET:",
	process.env.JWT_SECRET ? "Set (not showing for security)" : "Not set"
);
console.log("ADMIN_SECRET:", process.env.ADMIN_SECRET || "Not set");

// Also check if the file is being read
const fs = require("fs");
const path = require("path");

console.log("\nCurrent directory:", process.cwd());
console.log("Files in current directory:");
try {
	const files = fs.readdirSync(".");
	console.log(files.join(", "));
} catch (err) {
	console.log("Error reading directory:", err.message);
}

try {
	const envPath = path.resolve(process.cwd(), ".env");
	console.log("\nLooking for .env file at:", envPath);

	if (fs.existsSync(envPath)) {
		console.log(".env file exists");
		const envFile = fs.readFileSync(envPath, "utf8");
		console.log("\nEnv file contains:");
		console.log(envFile);
	} else {
		console.log(".env file does not exist at this path");
	}
} catch (err) {
	console.log("\nError checking .env file:", err.message);
}
