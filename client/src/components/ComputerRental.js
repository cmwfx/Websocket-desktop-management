import React, { useState, useEffect, useCallback } from "react";
import axios from "../utils/axios";
import { useAuth } from "../context/AuthContext";
import "../styles/rental.css";
import { io } from "socket.io-client";

// Use relative URLs in production:
const BACKEND_URL =
	process.env.NODE_ENV === "production"
		? ""
		: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const socket = process.env.NODE_ENV === "production" ? io() : io(BACKEND_URL);

const ComputerRental = () => {
	const [computers, setComputers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeRentals, setActiveRentals] = useState([]);
	const [selectedComputer, setSelectedComputer] = useState(null);
	const [rentalDuration, setRentalDuration] = useState(1);
	const [rentalModalOpen, setRentalModalOpen] = useState(false);
	const [confirmCancelModalOpen, setConfirmCancelModalOpen] = useState(false);
	const [rentalToCancel, setRentalToCancel] = useState(null);
	const [isConnected, setIsConnected] = useState(false);
	const { auth } = useAuth();

	// Check if auth is available
	const userCredits = auth?.user?.credits || 0;

	// Improved fetchComputers function using useCallback
	const fetchComputers = useCallback(async () => {
		try {
			setLoading(true);

			// Get all computers first
			const allComputersResponse = await axios.get("/api/computers");

			let computerList = [];
			if (
				allComputersResponse.data &&
				Array.isArray(allComputersResponse.data)
			) {
				computerList = allComputersResponse.data;

				// Filter for available computers (isRegistered, !isRented, status=available)
				const availableComputers = computerList.filter(
					(comp) =>
						comp.isRegistered && !comp.isRented && comp.status === "available"
				);

				setComputers(availableComputers);
			} else {
				setComputers([]);
			}

			setLoading(false);
		} catch (err) {
			console.error("Error fetching computers:", err);
			setError("Failed to load available computers");
			setLoading(false);
			setComputers([]);
		}
	}, []);

	// Fetch user's active rentals
	const fetchRentals = useCallback(async () => {
		try {
			const response = await axios.get("/api/rentals/my-rentals");

			// Ensure response.data is an array before filtering
			if (Array.isArray(response.data)) {
				const active = response.data.filter(
					(rental) => rental.status === "active"
				);
				setActiveRentals(active);
			} else {
				console.error("Expected array but got:", response.data);
				setActiveRentals([]);
			}
		} catch (err) {
			console.error("Error fetching rentals:", err);
			setActiveRentals([]);
		}
	}, []);

	useEffect(() => {
		// Initial fetch
		fetchComputers();
		fetchRentals();

		// Socket.IO event handlers
		socket.on("connect", () => {
			setIsConnected(true);
			// Refresh data when reconnected
			fetchComputers();
			fetchRentals();
		});

		socket.on("disconnect", () => {
			setIsConnected(false);
		});

		// Listen for computer updates
		socket.on("computerUpdate", () => {
			fetchComputers();
		});

		// Listen for rental updates
		socket.on("rentalUpdate", () => {
			fetchRentals();
		});

		// Set up periodic refresh
		const refreshInterval = setInterval(() => {
			fetchComputers();
			fetchRentals();
		}, 15000); // Refresh every 15 seconds

		// Cleanup on unmount
		return () => {
			socket.off("connect");
			socket.off("disconnect");
			socket.off("computerUpdate");
			socket.off("rentalUpdate");
			clearInterval(refreshInterval);
		};
	}, [fetchComputers, fetchRentals]);

	const openRentalModal = (computer) => {
		setSelectedComputer(computer);
		setRentalModalOpen(true);
	};

	const closeRentalModal = () => {
		setRentalModalOpen(false);
		setRentalDuration(1);
	};

	const openCancelConfirmModal = (rentalId) => {
		setRentalToCancel(rentalId);
		setConfirmCancelModalOpen(true);
	};

	const closeCancelConfirmModal = () => {
		setConfirmCancelModalOpen(false);
		setRentalToCancel(null);
	};

	const handleRentComputer = async () => {
		if (!selectedComputer) return;

		try {
			const response = await axios.post("/api/rentals", {
				computerId: selectedComputer._id,
				duration: rentalDuration,
			});

			// Close the modal first
			closeRentalModal();

			// Refresh rentals and computers lists
			fetchRentals();
			fetchComputers();

			// Show success message
			alert(
				`Computer rented successfully! Password: ${response.data.password}`
			);
		} catch (err) {
			console.error("Error renting computer:", err);
			if (err.response?.data?.message === "Insufficient credits") {
				alert(
					`You don't have enough credits. Required: ${err.response.data.required}, Available: ${err.response.data.available}`
				);
			} else {
				alert("Failed to rent computer. Please try again.");
			}
		}
	};

	const handleCancelRental = async () => {
		if (!rentalToCancel) return;

		try {
			await axios.post(`/api/rentals/${rentalToCancel}/cancel`);

			// Close the confirmation modal first
			closeCancelConfirmModal();

			// Refresh rentals and computers lists
			fetchRentals();
			fetchComputers();

			alert("Rental cancelled successfully");
		} catch (err) {
			console.error("Error cancelling rental:", err);
			alert("Failed to cancel rental. Please try again.");
			closeCancelConfirmModal();
		}
	};

	const calculateTotalCost = () => {
		if (!selectedComputer) return 0;
		return selectedComputer.hourlyRate * rentalDuration;
	};

	const formatTimeRemaining = (endTime) => {
		const end = new Date(endTime);
		const now = new Date();
		const diffMs = end - now;

		if (diffMs <= 0) return "Expired";

		const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

		return `${diffHrs}h ${diffMins}m remaining`;
	};

	// Check if auth is still loading
	if (auth?.loading) {
		return <div className="loading">Loading user data...</div>;
	}

	if (loading) {
		return <div className="loading">Loading computers...</div>;
	}

	if (error) {
		return <div className="error-message">{error}</div>;
	}

	return (
		<div className="computer-rental">
			<div className="connection-status-container">
				<div className="connection-status-indicator">
					Status:{" "}
					<span className={isConnected ? "connected" : "disconnected"}>
						{isConnected ? "Connected" : "Disconnected"}
					</span>
				</div>

				<button
					className="refresh-button"
					onClick={() => {
						console.log("Manually refreshing computers and rentals...");
						fetchComputers();
						fetchRentals();
					}}
					title="Refresh Computers and Rentals"
				>
					Refresh
				</button>
			</div>

			<div className="rental-section">
				<h2>My Active Rentals</h2>
				{activeRentals.length === 0 ? (
					<p className="no-rentals">You don't have any active rentals</p>
				) : (
					<div className="rental-list">
						{Array.isArray(activeRentals) &&
							activeRentals.map((rental) => (
								<div key={rental._id} className="rental-card">
									<div className="rental-header">
										<h3>{rental.computerId.computerName}</h3>
										<span className="time-remaining">
											{formatTimeRemaining(rental.endTime)}
										</span>
									</div>
									<div className="rental-details">
										<p>
											<strong>Password:</strong> {rental.password}
										</p>
										<p>
											<strong>Start Time:</strong>{" "}
											{new Date(rental.startTime).toLocaleString()}
										</p>
										<p>
											<strong>End Time:</strong>{" "}
											{new Date(rental.endTime).toLocaleString()}
										</p>
										<p>
											<strong>Cost:</strong> ${rental.cost}
										</p>
									</div>
									<button
										className="cancel-button"
										onClick={() => openCancelConfirmModal(rental._id)}
									>
										Cancel Rental
									</button>
								</div>
							))}
					</div>
				)}
			</div>

			<div className="rental-section">
				<h2>Available Computers</h2>
				{computers.length === 0 ? (
					<p className="no-computers">No computers available for rent</p>
				) : (
					<div className="computer-list">
						{Array.isArray(computers) &&
							computers.map((computer) => (
								<div key={computer._id} className="computer-card">
									<h3>{computer.computerName}</h3>
									<div className="computer-details">
										<p>
											<strong>Specifications:</strong>
										</p>
										<ul>
											{computer.specifications.osInfo && (
												<li>OS: {computer.specifications.osInfo}</li>
											)}
											{computer.specifications.windowsVersion && (
												<li>
													Windows: {computer.specifications.windowsVersion}
												</li>
											)}
										</ul>
										<p>
											<strong>Rate:</strong> ${computer.hourlyRate}/hour
										</p>
									</div>
									<button
										className="rent-button"
										onClick={() => openRentalModal(computer)}
										disabled={userCredits < computer.hourlyRate}
									>
										Rent Computer
									</button>
									{userCredits < computer.hourlyRate && (
										<p className="insufficient-credits">Insufficient credits</p>
									)}
								</div>
							))}
					</div>
				)}
			</div>

			{rentalModalOpen && selectedComputer && (
				<div className="modal-overlay">
					<div className="rental-modal">
						<h2>Rent Computer</h2>
						<h3>{selectedComputer.computerName}</h3>

						<div className="modal-content">
							<p>
								<strong>Rate:</strong> ${selectedComputer.hourlyRate}/hour
							</p>
							<p>
								<strong>Your Credits:</strong> {userCredits}
							</p>

							<div className="duration-selector">
								<label htmlFor="duration">Rental Duration (hours):</label>
								<input
									type="number"
									id="duration"
									min="1"
									max="24"
									value={rentalDuration}
									onChange={(e) => setRentalDuration(parseInt(e.target.value))}
								/>
							</div>

							<p className="total-cost">
								<strong>Total Cost:</strong> ${calculateTotalCost()}
							</p>

							{calculateTotalCost() > userCredits && (
								<p className="insufficient-credits">
									You don't have enough credits for this rental duration
								</p>
							)}
						</div>

						<div className="modal-actions">
							<button className="cancel-button" onClick={closeRentalModal}>
								Cancel
							</button>
							<button
								className="confirm-button"
								onClick={handleRentComputer}
								disabled={calculateTotalCost() > userCredits}
							>
								Confirm Rental
							</button>
						</div>
					</div>
				</div>
			)}

			{confirmCancelModalOpen && (
				<div className="modal-overlay">
					<div className="rental-modal">
						<h2>Cancel Rental</h2>
						<p>
							Are you sure you want to cancel this rental? You will receive a
							partial refund based on the time remaining.
						</p>

						<div className="modal-actions">
							<button
								className="cancel-button"
								onClick={closeCancelConfirmModal}
							>
								No, Keep Rental
							</button>
							<button className="confirm-button" onClick={handleCancelRental}>
								Yes, Cancel Rental
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ComputerRental;
