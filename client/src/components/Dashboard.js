import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import GuestManager from "./GuestManager";
import ComputerManagement from "./ComputerManagement";
import axios from "axios";
import "../styles/dashboard.css";

const Dashboard = () => {
	const { auth, logout } = useAuth();
	const { socket, isConnected } = useSocket();
	const [guests, setGuests] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	// Define fetchGuests as a callback to avoid recreation on each render
	const fetchGuests = useCallback(async () => {
		try {
			console.log("Fetching guests...");
			setRefreshing(true);

			const response = await axios.get("/api/connected-guests");
			console.log("Guests API response:", response.data);

			if (response.data && response.data.guests) {
				console.log(
					`Received ${response.data.guests.length} guests from server`
				);

				// Log each guest for debugging
				response.data.guests.forEach((guest, index) => {
					console.log(`Guest ${index + 1}:`, {
						guestId: guest.guestId,
						hostname: guest.hostname,
						isComputer: guest.isComputer,
						computerStatus: guest.computerStatus,
						status: guest.status,
					});
				});

				setGuests(response.data.guests);
			} else {
				console.warn("Invalid guest data format:", response.data);
				setGuests([]);
			}

			setError(null);
		} catch (err) {
			console.error("Error fetching guests:", err);
			setError("Failed to load guests. Please try again.");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	// Manual refresh function
	const handleRefreshGuests = () => {
		console.log("Manual refresh triggered");
		fetchGuests();
	};

	useEffect(() => {
		if (!auth?.user) {
			navigate("/login");
			return;
		}

		// Fetch guests when component mounts and when socket connects
		console.log("Dashboard mounted or socket connection changed:", {
			isConnected,
		});
		fetchGuests();

		// Set up socket event handlers
		if (socket) {
			console.log("Setting up socket event listeners");

			socket.on("guestConnected", (data) => {
				console.log("Guest connected event:", data);
				fetchGuests();
			});

			socket.on("guestDisconnected", (data) => {
				console.log("Guest disconnected event:", data);
				fetchGuests();
			});

			socket.on("guestUpdated", (data) => {
				console.log("Guest updated event:", data);
				fetchGuests();
			});

			socket.on("computerUpdated", (data) => {
				console.log("Computer updated event:", data);
				fetchGuests();
			});
		}

		// Set up interval to refresh guests
		const interval = setInterval(() => {
			console.log("Refreshing guests on interval");
			fetchGuests();
		}, 15000); // Refresh every 15 seconds

		// Clean up on unmount
		return () => {
			if (socket) {
				socket.off("guestConnected");
				socket.off("guestDisconnected");
				socket.off("guestUpdated");
				socket.off("computerUpdated");
			}
			clearInterval(interval);
		};
	}, [auth?.user, navigate, socket, isConnected, fetchGuests]);

	return (
		<div className="dashboard-container">
			<Navbar />
			<div className="dashboard-content">
				<div className="dashboard-header">
					<h1>Admin Dashboard</h1>
					<div className="connection-status">
						{isConnected ? (
							<span className="status-connected">Connected to server</span>
						) : (
							<span className="status-disconnected">
								Disconnected from server
							</span>
						)}
					</div>
				</div>

				<div className="dashboard-sections">
					<div className="dashboard-section">
						<div className="guest-header">
							<h2>Guest Management</h2>
							<div className="guest-header-actions">
								<button
									className="refresh-button"
									onClick={handleRefreshGuests}
									disabled={refreshing}
								>
									{refreshing ? "Refreshing..." : "Refresh Guests"}
								</button>
							</div>
						</div>

						{loading ? (
							<div className="loading-spinner-container">
								<div className="loading-spinner"></div>
								<p>Loading guests...</p>
							</div>
						) : error ? (
							<div className="error-message">{error}</div>
						) : (
							<GuestManager guests={guests} />
						)}
					</div>

					<div className="dashboard-section">
						<h2>Computer Management</h2>
						<ComputerManagement />
					</div>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
