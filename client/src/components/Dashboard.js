import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GuestManager from "./GuestManager";
import CommandPanel from "./CommandPanel";
import ComputerRental from "./ComputerRental";
import "../styles/dashboard.css";

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
	const [showUserMenu, setShowUserMenu] = useState(false);
	const { auth, logout } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		// Fetch initial list of guests
		const fetchGuests = async () => {
			try {
				const response = await axios.get("/api/connected-guests");
				if (response.data.guests) {
					setGuests(response.data.guests);
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
			console.log("Received guest update:", updatedGuests);
			if (Array.isArray(updatedGuests)) {
				setGuests(updatedGuests);
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

	const handleRegisterAsComputer = async (guestId) => {
		try {
			const response = await axios.post("/api/computers/register-guest", {
				guestId,
				hourlyRate: 5, // Default hourly rate
			});
			alert(`Guest ${guestId} registered as computer successfully!`);
		} catch (error) {
			console.error("Error registering guest as computer:", error);
			if (error.response?.data?.message?.includes("already exists")) {
				alert(`This guest is already registered as a computer.`);
			} else {
				alert(
					`Error registering guest as computer: ${
						error.response?.data?.message || error.message
					}`
				);
			}
		}
	};

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	const toggleUserMenu = () => {
		setShowUserMenu(!showUserMenu);
	};

	// Determine if user is admin
	const isAdmin = auth?.user?.role === "admin";
	console.log("Auth state in Dashboard:", auth); // Debug log
	console.log("Is admin?", isAdmin, "Role:", auth?.user?.role); // Debug log

	// If auth is still loading or user is not available, show loading state
	if (auth?.loading || !auth?.user) {
		console.log("Dashboard loading state:", {
			loading: auth?.loading,
			user: auth?.user,
		}); // Debug log
		return <div className="loading">Loading dashboard...</div>;
	}

	return (
		<div className="dashboard">
			<div className="dashboard-header">
				<div className="header-left">
					<h1>Desktop Management Dashboard</h1>
					<div className="connection-status">
						Status: {isConnected ? "Connected" : "Disconnected"}
					</div>
				</div>
				<div className="header-right">
					<div className="user-menu-container">
						<div className="user-info" onClick={toggleUserMenu}>
							<span className="username">{auth?.user?.username || "User"}</span>
							<span className={`role-badge ${isAdmin ? "admin" : ""}`}>
								{auth?.user?.role || "user"}
							</span>
							<span className="credits">
								Credits: {auth?.user?.credits || 0}
							</span>
							<i className="dropdown-icon">▼</i>
						</div>
						{showUserMenu && (
							<div className="user-dropdown">
								<div className="dropdown-item">
									<span>Profile</span>
								</div>
								{isAdmin && (
									<div className="dropdown-item">
										<span>Admin Panel</span>
									</div>
								)}
								<div className="dropdown-item" onClick={handleLogout}>
									<span>Logout</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="dashboard-content">
				{isAdmin ? (
					// Admin view - show guest management and command panel
					<>
						<div className="dashboard-sidebar">
							<GuestManager
								guests={guests}
								selectedGuest={selectedGuest}
								onSelectGuest={handleGuestSelect}
								onRegisterAsComputer={handleRegisterAsComputer}
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
					</>
				) : (
					// Regular user view - show computer rental interface
					<div className="dashboard-main">
						<ComputerRental />
					</div>
				)}
			</div>
		</div>
	);
};

export default Dashboard;
