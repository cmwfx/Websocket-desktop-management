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

	return (
		<div className="guest-manager">
			<h3>Connected Guests {guests.length > 0 && `(${guests.length})`}</h3>
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
									{guest.isComputer && (
										<div className="computer-info">
											<p
												className={`computer-status status-${guest.computerStatus}`}
											>
												Computer Status: {guest.computerStatus || "unknown"}
											</p>
											{guest.computerName && (
												<p>Computer Name: {guest.computerName}</p>
											)}
										</div>
									)}
								</div>
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
