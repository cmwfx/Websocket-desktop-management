import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import GuestList from "./GuestList";
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
				setGuests(response.data.guests || []);
			} catch (error) {
				console.error("Error fetching guests:", error);
			}
		};

		fetchGuests();

		// Socket.IO event handlers
		socket.on("connect", () => {
			setIsConnected(true);
			console.log("Connected to server");
		});

		socket.on("disconnect", () => {
			setIsConnected(false);
			console.log("Disconnected from server");
		});

		socket.on("guestUpdate", (updatedGuests) => {
			setGuests(updatedGuests || []);
		});

		socket.on("commandUpdate", (result) => {
			setCommandResults((prev) => [result, ...prev]);
		});

		// Cleanup on unmount
		return () => {
			socket.off("connect");
			socket.off("disconnect");
			socket.off("guestUpdate");
			socket.off("commandUpdate");
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
					<GuestList
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
