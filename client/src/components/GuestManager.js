import React, { useState } from "react";
import axios from "axios";
import "../styles/dashboard.css";

const GuestManager = ({ guests }) => {
	const [registering, setRegistering] = useState(false);
	const [registerError, setRegisterError] = useState(null);

	// Format last seen time
	const formatLastSeen = (lastSeen) => {
		if (!lastSeen) return "Unknown";

		const date = new Date(lastSeen);
		if (isNaN(date.getTime())) return "Invalid date";

		const now = new Date();
		const diffMs = now - date;
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return "Just now";
		if (diffMins < 60)
			return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24)
			return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

		const options = {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		};
		return date.toLocaleDateString(undefined, options);
	};

	// Get status class for styling
	const getStatusClass = (guest) => {
		if (guest.status === "online") return "status-online";
		if (guest.isComputer) return "status-computer";
		return "status-offline";
	};

	// Register a guest as a computer
	const handleRegisterAsComputer = async (guest) => {
		try {
			setRegistering(true);
			setRegisterError(null);

			const response = await axios.post("/api/computers/register", {
				guestId: guest.guestId,
				computerName: guest.hostname || "Computer",
				hourlyRate: 5, // Default hourly rate
			});

			console.log("Computer registered:", response.data);
			// Success message or notification could be added here
		} catch (error) {
			console.error("Error registering computer:", error);
			setRegisterError(
				error.response?.data?.message ||
					"Failed to register computer. Please try again."
			);
		} finally {
			setRegistering(false);
		}
	};

	// Sort guests: online first, then computers, then by hostname
	const sortedGuests = [...guests].sort((a, b) => {
		// Online guests first
		if (a.status === "online" && b.status !== "online") return -1;
		if (a.status !== "online" && b.status === "online") return 1;

		// Then computers
		if (a.isComputer && !b.isComputer) return -1;
		if (!a.isComputer && b.isComputer) return 1;

		// Then sort by hostname
		return (a.hostname || "").localeCompare(b.hostname || "");
	});

	return (
		<div className="guest-manager">
			<div className="guest-count">
				Connected Guests:{" "}
				{sortedGuests.filter((g) => g.status === "online").length} online,
				{sortedGuests.filter((g) => g.isComputer).length} computers,
				{sortedGuests.length} total
			</div>

			{registerError && <div className="error-message">{registerError}</div>}

			<div className="guest-list">
				{sortedGuests.length === 0 ? (
					<div className="no-guests-message">
						No guests connected. Guests will appear here when they connect to
						the server.
					</div>
				) : (
					sortedGuests.map((guest) => (
						<div
							key={guest.guestId}
							className={`guest-item ${getStatusClass(guest)} ${
								guest.isComputer ? "computer-guest" : ""
							}`}
						>
							<div className="guest-header">
								<div className="guest-hostname">
									{guest.hostname || "Unknown Host"}
									{guest.isComputer && (
										<span className="computer-badge">Computer</span>
									)}
								</div>
								<div className={`guest-status ${guest.status}`}>
									{guest.status === "online" ? "Online" : "Offline"}
								</div>
							</div>

							<div className="guest-details">
								<div className="guest-info">
									<div>Guest ID: {guest.guestId}</div>
									<div>IP: {guest.ipAddress || "Unknown"}</div>
									<div>Last seen: {formatLastSeen(guest.lastSeen)}</div>
									<div>OS: {guest.osInfo || "Unknown"}</div>
								</div>

								{guest.isComputer && (
									<div className="computer-info">
										<div>
											Computer Status: {guest.computerStatus || "Unknown"}
										</div>
										<div>Hourly Rate: ${guest.hourlyRate || "N/A"}</div>
										<div>Computer ID: {guest.computerId || "N/A"}</div>
									</div>
								)}

								{!guest.isComputer && (
									<div className="guest-actions">
										<button
											className="register-computer-btn"
											onClick={() => handleRegisterAsComputer(guest)}
											disabled={registering}
										>
											{registering ? "Registering..." : "Register as Computer"}
										</button>
									</div>
								)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};

export default GuestManager;
