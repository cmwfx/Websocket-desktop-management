import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import GuestManager from "./GuestManager";
import CommandPanel from "./CommandPanel";

// Use relative URLs in production:
const BACKEND_URL =
	process.env.NODE_ENV === "production"
		? ""
		: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const socket = process.env.NODE_ENV === "production" ? io() : io(BACKEND_URL);

const Dashboard = () => {
	const [guests, setGuests] = useState([]);
	const [selectedGuest, setSelectedGuest] = useState(null);
	const [commandResults, setCommandResults] = useState([]);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		// Fetch initial list of guests
		const fetchGuests = async () => {
			try {
				const response = await axios.get("/api/connected-guests");
				if (response.data.guests) {
					// Convert array of guest IDs to array of guest objects if necessary
					const guestObjects = Array.isArray(response.data.guests)
						? response.data.guests.map((guestId) =>
								typeof guestId === "string"
									? { guestId, status: "online" }
									: guestId
						  )
						: [];
					setGuests(guestObjects);
				}
			} catch (error) {
				console.error("Error fetching guests:", error);
			}
		};

		fetchGuests();

		// Socket.IO event handlers
		socket.on("connect", () => {
			setIsConnected(true);
			console.log("Connected to server");
			// Refresh guest list when reconnected
			fetchGuests();
		});

		socket.on("disconnect", () => {
			setIsConnected(false);
			console.log("Disconnected from server");
			// Mark all guests as potentially offline when disconnected
			setGuests((prevGuests) =>
				prevGuests.map((guest) => ({
					...guest,
					status: "unknown",
				}))
			);
		});

		socket.on("guestUpdate", (updatedGuests) => {
			if (Array.isArray(updatedGuests)) {
				// Convert array of guest IDs to array of guest objects if necessary
				const guestObjects = updatedGuests.map((guest) =>
					typeof guest === "string"
						? { guestId: guest, status: "online" }
						: guest
				);
				setGuests(guestObjects);
			}
		});

		socket.on("commandUpdate", (result) => {
			setCommandResults((prev) => [result, ...prev]);
		});

		// Set up periodic refresh of guest list
		const refreshInterval = setInterval(fetchGuests, 30000); // Refresh every 30 seconds

		// Cleanup on unmount
		return () => {
			socket.off("connect");
			socket.off("disconnect");
			socket.off("guestUpdate");
			socket.off("commandUpdate");
			clearInterval(refreshInterval);
		};
	}, []);

	const handleGuestSelect = (guestId) => {
		setSelectedGuest(guestId);
	};

	const handleSendCommand = async (commandData) => {
		if (!selectedGuest) {
			alert("Please select a guest first");
			return;
		}

		try {
			await axios.post("/api/send-command", {
				guestId: selectedGuest,
				commandData,
			});
		} catch (error) {
			console.error("Error sending command:", error);
			alert(
				`Error sending command: ${error.response?.data?.error || error.message}`
			);
		}
	};

	return (
		<div className="dashboard">
			<div className="dashboard-header">
				<h1>Desktop Management Dashboard</h1>
				<div className="connection-status">
					Status: {isConnected ? "Connected" : "Disconnected"}
				</div>
			</div>

			<div className="dashboard-content">
				<div className="dashboard-sidebar">
					<GuestManager
						guests={guests}
						selectedGuest={selectedGuest}
						onSelectGuest={handleGuestSelect}
					/>
				</div>

				<div className="dashboard-main">
					<CommandPanel
						selectedGuest={selectedGuest}
						onSendCommand={handleSendCommand}
					/>

					<div className="command-results">
						<h3>Command Results</h3>
						<div className="results-list">
							{commandResults.length === 0 ? (
								<p>No command results yet</p>
							) : (
								commandResults.map((result, index) => (
									<div
										key={index}
										className={`result-item ${
											result.success ? "success" : "error"
										}`}
									>
										<div className="result-header">
											<span className="guest-id">{result.guestId}</span>
											<span className="action">{result.action}</span>
											<span className="status">
												{result.success ? "Success" : "Failed"}
											</span>
										</div>
										{result.error && (
											<div className="error-message">{result.error}</div>
										)}
									</div>
								))
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
