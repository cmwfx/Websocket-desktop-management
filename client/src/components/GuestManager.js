import React, { useState } from "react";
import axios from "../utils/axios";

const GuestManager = ({
	guests,
	selectedGuest,
	onSelectGuest,
	onRegisterAsComputer,
}) => {
	const [expandedGuest, setExpandedGuest] = useState(null);

	// Function to get status class
	const getStatusClass = (guest) => {
		if (!guest) return "status-unknown";
		return guest.status === "online" ? "status-online" : "status-offline";
	};

	// Function to format last seen time
	const formatLastSeen = (lastSeen) => {
		if (!lastSeen) return "Never";
		const date = new Date(lastSeen);
		return date.toLocaleString();
	};

	// Function to get computer status class
	const getComputerStatusClass = (status) => {
		switch (status) {
			case "available":
				return "status-available";
			case "unavailable":
				return "status-unavailable";
			case "rented":
				return "status-rented";
			case "offline":
				return "status-offline";
			default:
				return "status-unknown";
		}
	};

	// Function to reset a computer's status to available
	const handleResetStatus = async (computerId) => {
		try {
			await axios.put(`/api/computers/${computerId}`, {
				status: "available",
			});
			alert("Computer status reset to available.");
		} catch (err) {
			console.error("Error resetting computer status:", err);
			alert("Failed to reset computer status");
		}
	};

	// Toggle guest expansion
	const toggleExpand = (guestId) => {
		setExpandedGuest(expandedGuest === guestId ? null : guestId);
	};

	// Filter to show online guests first, then sort by isComputer
	const sortedGuests = [...guests].sort((a, b) => {
		// Online guests come first
		if (a.status === "online" && b.status !== "online") return -1;
		if (a.status !== "online" && b.status === "online") return 1;

		// Then computers come before non-computers
		if (a.isComputer && !b.isComputer) return -1;
		if (!a.isComputer && b.isComputer) return 1;

		// Then sort by hostname
		return (a.hostname || "").localeCompare(b.hostname || "");
	});

	// Count online and computer guests
	const onlineCount = guests.filter((g) => g.status === "online").length;
	const computerCount = guests.filter((g) => g.isComputer).length;

	return (
		<div className="guest-manager">
			<h3>
				Connected Guests{" "}
				{guests.length > 0 &&
					`(${guests.length} total, ${onlineCount} online, ${computerCount} computers)`}
			</h3>

			{guests.length === 0 ? (
				<p className="no-guests">No guests connected</p>
			) : (
				<div className="guest-list">
					{sortedGuests.map((guest) => (
						<div
							key={guest.guestId}
							className={`guest-item ${getStatusClass(guest)} ${
								selectedGuest === guest.guestId ? "selected" : ""
							} ${guest.isComputer ? "is-computer" : ""}`}
						>
							<div className="guest-info">
								<div
									className="guest-header"
									onClick={() => onSelectGuest(guest.guestId)}
								>
									<span className="guest-id">{guest.guestId}</span>
									<span
										className={`status-indicator ${getStatusClass(guest)}`}
									/>
								</div>

								<div
									className="guest-basic-details"
									onClick={() => toggleExpand(guest.guestId)}
								>
									<p>Hostname: {guest.hostname || "Unknown"}</p>
									<p>IP: {guest.ipAddress || "Unknown"}</p>
									<p>Last Seen: {formatLastSeen(guest.lastSeen)}</p>

									{guest.isComputer && (
										<div className="computer-info">
											<p
												className={`computer-status ${getComputerStatusClass(
													guest.computerStatus
												)}`}
											>
												Computer Status: {guest.computerStatus || "unknown"}
											</p>
										</div>
									)}

									<span className="expand-toggle">
										{expandedGuest === guest.guestId ? "▲ Less" : "▼ More"}
									</span>
								</div>

								{expandedGuest === guest.guestId && (
									<div className="guest-expanded-details">
										<p>OS: {guest.osInfo || "Unknown"}</p>
										{guest.windowsVersion && (
											<p>Windows: {guest.windowsVersion}</p>
										)}
										{guest.desktopEnvironment && (
											<p>Desktop: {guest.desktopEnvironment}</p>
										)}
										{guest.systemUptime && <p>Uptime: {guest.systemUptime}</p>}

										{guest.isComputer && (
											<div className="computer-expanded-info">
												<p>Computer ID: {guest.computerId}</p>
												{(guest.computerStatus === "unavailable" ||
													guest.computerStatus === "offline") && (
													<button
														className="reset-status-btn"
														onClick={() => handleResetStatus(guest.computerId)}
													>
														Reset to Available
													</button>
												)}
											</div>
										)}
									</div>
								)}
							</div>

							{onRegisterAsComputer && !guest.isComputer && (
								<button
									className="register-computer-btn"
									onClick={() => onRegisterAsComputer(guest.guestId)}
								>
									Register as Computer
								</button>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default GuestManager;
