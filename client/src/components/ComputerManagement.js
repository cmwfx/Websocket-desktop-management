import React, { useState, useEffect } from "react";
import axios from "../utils/axios";
import "../styles/admin.css";

const ComputerManagement = () => {
	const [computers, setComputers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default

	useEffect(() => {
		// Function to fetch all computers
		const fetchComputers = async () => {
			try {
				setLoading(true);
				const response = await axios.get("/api/computers");
				setComputers(response.data);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching computers:", err);
				setError("Failed to load computers");
				setLoading(false);
			}
		};

		// Initial fetch
		fetchComputers();

		// Set up periodic refresh
		const interval = setInterval(fetchComputers, refreshInterval);

		// Cleanup
		return () => clearInterval(interval);
	}, [refreshInterval]);

	// Function to get status class for styling
	const getStatusClass = (status) => {
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

	// Function to format date
	const formatDate = (dateString) => {
		if (!dateString) return "Never";
		const date = new Date(dateString);
		return date.toLocaleString();
	};

	// Handle refresh rate change
	const handleRefreshRateChange = (e) => {
		const value = parseInt(e.target.value);
		setRefreshInterval(value);
	};

	// Force a refresh
	const handleForceRefresh = () => {
		const fetchComputers = async () => {
			try {
				setLoading(true);
				const response = await axios.get("/api/computers");
				setComputers(response.data);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching computers:", err);
				setError("Failed to load computers");
				setLoading(false);
			}
		};
		fetchComputers();
	};

	// Reset a computer's status to available
	const handleResetStatus = async (computerId) => {
		try {
			await axios.put(`/api/computers/${computerId}`, {
				status: "available",
			});

			// Update the local state
			setComputers(
				computers.map((computer) =>
					computer._id === computerId
						? { ...computer, status: "available" }
						: computer
				)
			);
		} catch (err) {
			console.error("Error resetting computer status:", err);
			alert("Failed to reset computer status");
		}
	};

	if (loading) {
		return <div className="loading">Loading computers...</div>;
	}

	if (error) {
		return <div className="error-message">{error}</div>;
	}

	return (
		<div className="computer-management">
			<div className="section-header">
				<h2>Computer Management</h2>
				<div className="refresh-settings">
					<label htmlFor="refresh-rate">Refresh Rate (ms):</label>
					<select
						id="refresh-rate"
						value={refreshInterval}
						onChange={handleRefreshRateChange}
					>
						<option value={5000}>5 seconds</option>
						<option value={15000}>15 seconds</option>
						<option value={30000}>30 seconds</option>
						<option value={60000}>1 minute</option>
					</select>
					<button onClick={handleForceRefresh}>Refresh Now</button>
				</div>
			</div>

			{computers.length === 0 ? (
				<p className="no-computers">No computers registered</p>
			) : (
				<div className="computer-list">
					<table className="data-table">
						<thead>
							<tr>
								<th>Computer Name</th>
								<th>Guest ID</th>
								<th>Status</th>
								<th>Last Updated</th>
								<th>Hourly Rate</th>
								<th>Current User</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{computers.map((computer) => (
								<tr
									key={computer._id}
									className={getStatusClass(computer.status)}
								>
									<td>{computer.computerName}</td>
									<td>{computer.guestId}</td>
									<td
										className={`status-cell ${getStatusClass(computer.status)}`}
									>
										{computer.status}
									</td>
									<td>{formatDate(computer.updatedAt)}</td>
									<td>${computer.hourlyRate}/hr</td>
									<td>{computer.currentUser?.username || "None"}</td>
									<td className="actions-cell">
										<button
											className="action-button view-button"
											title="View Details"
										>
											View
										</button>
										{(computer.status === "unavailable" ||
											computer.status === "offline") && (
											<button
												className="action-button reset-button"
												title="Mark as Available"
												onClick={() => handleResetStatus(computer._id)}
											>
												Reset
											</button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default ComputerManagement;
