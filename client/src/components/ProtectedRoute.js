import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, requireAdmin }) => {
	const { auth } = useAuth();
	const location = useLocation();

	if (auth.loading) {
		// You might want to show a loading spinner here
		return <div>Loading...</div>;
	}

	if (!auth.isAuthenticated) {
		// Redirect to login page but save the location they were trying to access
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	if (requireAdmin && !auth.user?.isAdmin) {
		// If admin access is required but user is not admin, redirect to dashboard
		return <Navigate to="/dashboard" replace />;
	}

	return children;
};

export default ProtectedRoute;
