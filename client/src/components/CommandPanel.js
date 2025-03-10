import React, { useState } from "react";

const CommandPanel = ({ selectedGuest, onSendCommand }) => {
	const [username, setUsername] = useState("");
	const [newPassword, setNewPassword] = useState("");

	const handleChangePassword = () => {
		if (!username || !newPassword) {
			alert("Please enter both username and password");
			return;
		}

		onSendCommand({
			action: "changePassword",
			username,
			newPassword,
		});

		// Clear the password field after sending
		setNewPassword("");
	};

	const handleLockComputer = () => {
		onSendCommand({ action: "lockComputer" });
	};

	const handleShutdown = () => {
		if (
			window.confirm(
				"Are you sure you want to shut down this computer? It will shutdown in 1 minute."
			)
		) {
			onSendCommand({ action: "shutdown" });
		}
	};

	const handleRestart = () => {
		if (
			window.confirm(
				"Are you sure you want to restart this computer? It will restart in 1 minute."
			)
		) {
			onSendCommand({ action: "restart" });
		}
	};

	return (
		<div className="command-panel">
			<h3>Command Panel {selectedGuest ? `- ${selectedGuest}` : ""}</h3>

			{!selectedGuest ? (
				<p>Please select a guest from the list</p>
			) : (
				<div className="command-options">
					<div className="command-group">
						<h4>Password Management</h4>
						<div className="form-group">
							<label>Username:</label>
							<input
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder="Enter Linux username"
							/>
						</div>
						<div className="form-group">
							<label>New Password:</label>
							<input
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Enter new password"
							/>
						</div>
						<button onClick={handleChangePassword}>Change Password</button>
						<p className="note">
							Note: Requires sudo privileges on the guest machine
						</p>
					</div>

					<div className="command-group">
						<h4>System Control</h4>
						<button onClick={handleLockComputer}>Lock Screen</button>
						<button onClick={handleRestart} className="warning">
							Restart Computer
						</button>
						<button onClick={handleShutdown} className="danger">
							Shutdown Computer
						</button>
						<p className="note">
							Note: Shutdown and restart require sudo privileges
						</p>
					</div>
				</div>
			)}
		</div>
	);
};

export default CommandPanel;
