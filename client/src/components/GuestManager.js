import React from "react";

const GuestManager = ({
	guests,
	selectedGuest,
	onSelectGuest,
	onRegisterAsComputer,
}) => {
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

	return (
		<div className="guest-manager">
			<h3>Connected Guests</h3>
			{guests.length === 0 ? (
				<p>No guests connected</p>
			) : (
				<div className="guest-list">
					{guests.map((guest) => (
						<div
							key={guest.guestId}
							className={`guest-item ${getStatusClass(guest)} ${
								selectedGuest === guest.guestId ? "selected" : ""
							}`}
						>
							<div
								className="guest-info"
								onClick={() => onSelectGuest(guest.guestId)}
							>
								<div className="guest-header">
									<span className="guest-id">{guest.guestId}</span>
									<span
										className={`status-indicator ${getStatusClass(guest)}`}
									/>
								</div>
								<div className="guest-details">
									<p>Hostname: {guest.hostname || "Unknown"}</p>
									<p>IP: {guest.ipAddress || "Unknown"}</p>
									<p>OS: {guest.osInfo || "Unknown"}</p>
									<p>Last Seen: {formatLastSeen(guest.lastSeen)}</p>
								</div>
							</div>
							{onRegisterAsComputer && (
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
