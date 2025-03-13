import React, { useState, useEffect } from "react";
import axios from "../utils/axios";
import "../styles/userManagement.css";

const UserManagement = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [selectedUser, setSelectedUser] = useState(null);
	const [creditsToAdd, setCreditsToAdd] = useState(0);

	useEffect(() => {
		fetchUsers();
	}, []);

	const fetchUsers = async () => {
		try {
			const response = await axios.get("/api/users");
			setUsers(response.data);
			setLoading(false);
		} catch (error) {
			console.error("Error fetching users:", error);
			setError("Failed to load users");
			setLoading(false);
		}
	};

	const handleAddCredits = async (userId) => {
		try {
			if (!creditsToAdd || creditsToAdd <= 0) {
				alert("Please enter a valid amount of credits");
				return;
			}

			await axios.post(`/api/users/${userId}/add-credits`, {
				credits: parseInt(creditsToAdd),
			});

			// Refresh the users list
			await fetchUsers();

			// Reset form
			setCreditsToAdd(0);
			setSelectedUser(null);

			alert("Credits added successfully");
		} catch (error) {
			console.error("Error adding credits:", error);
			alert("Failed to add credits");
		}
	};

	if (loading) return <div className="loading">Loading users...</div>;
	if (error) return <div className="error">{error}</div>;

	return (
		<div className="user-management">
			<h2>User Management</h2>
			<div className="users-list">
				<table>
					<thead>
						<tr>
							<th>Username</th>
							<th>Role</th>
							<th>Current Credits</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{users.map((user) => (
							<tr key={user._id}>
								<td>{user.username}</td>
								<td>{user.role}</td>
								<td>{user.credits}</td>
								<td>
									{user.role !== "admin" && (
										<div className="credit-management">
											<input
												type="number"
												min="0"
												value={user._id === selectedUser ? creditsToAdd : ""}
												onChange={(e) => {
													setSelectedUser(user._id);
													setCreditsToAdd(e.target.value);
												}}
												placeholder="Amount"
											/>
											<button
												onClick={() => handleAddCredits(user._id)}
												className="add-credits-btn"
											>
												Add Credits
											</button>
										</div>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default UserManagement;
