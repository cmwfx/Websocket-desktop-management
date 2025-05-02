import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/navbar.css";

const Navbar = () => {
	const { auth, logout } = useAuth();
	const navigate = useNavigate();
	const [showUserMenu, setShowUserMenu] = useState(false);

	const isAdmin = auth?.user?.role === "admin";

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	const toggleUserMenu = () => {
		setShowUserMenu(!showUserMenu);
	};

	return (
		<div className="navbar">
			<div className="navbar-brand">
				<h1>Desktop Management</h1>
			</div>

			<div className="navbar-user">
				<div className="user-info" onClick={toggleUserMenu}>
					<span className="username">{auth?.user?.username || "User"}</span>
					<span className={`role-badge ${isAdmin ? "admin" : ""}`}>
						{auth?.user?.role || "user"}
					</span>
					<span className="credits">Credits: {auth?.user?.credits || 0}</span>
					<i className="dropdown-icon">▼</i>
				</div>

				{showUserMenu && (
					<div className="user-dropdown">
						<div className="dropdown-item">
							<span>Profile</span>
						</div>
						{isAdmin && (
							<div className="dropdown-item">
								<span>Admin Settings</span>
							</div>
						)}
						<div className="dropdown-item" onClick={handleLogout}>
							<span>Logout</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default Navbar;
