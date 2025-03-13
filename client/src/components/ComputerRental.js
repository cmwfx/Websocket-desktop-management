import React, { useState, useEffect } from "react";
import axios from "../utils/axios";
import { useAuth } from "../context/AuthContext";
import "../styles/rental.css";

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
	const { auth } = useAuth();

	// Check if auth is available
	const userCredits = auth?.user?.credits || 0;

	useEffect(() => {
		// Fetch available computers
		const fetchComputers = async () => {
			try {
				setLoading(true);
				const response = await axios.get("/api/computers/available");
				setComputers(response.data);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching computers:", err);
				setError("Failed to load available computers");
				setLoading(false);
			}
		};

		// Fetch user's active rentals
		const fetchRentals = async () => {
			try {
				const response = await axios.get("/api/rentals/my-rentals");
				// Ensure response.data is an array before filtering
				if (Array.isArray(response.data)) {
					setActiveRentals(
						response.data.filter((rental) => rental.status === "active")
					);
				} else {
					console.error("Expected array but got:", response.data);
					setActiveRentals([]);
				}
			} catch (err) {
				console.error("Error fetching rentals:", err);
			}
		};

		fetchComputers();
		fetchRentals();

		// Set up polling for updates
		const interval = setInterval(() => {
			fetchComputers();
			fetchRentals();
		}, 30000); // Every 30 seconds

		return () => clearInterval(interval);
	}, []);

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

			// Add the new rental to the active rentals
			setActiveRentals([...activeRentals, response.data]);

			// Remove the rented computer from available computers
			setComputers(computers.filter((c) => c._id !== selectedComputer._id));

			// Close the modal
			closeRentalModal();

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

			// Remove the cancelled rental from active rentals
			setActiveRentals(
				activeRentals.filter((rental) => rental._id !== rentalToCancel)
			);

			// Refresh available computers
			const response = await axios.get("/api/computers/available");
			setComputers(response.data);

			// Close the confirmation modal
			closeCancelConfirmModal();

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
