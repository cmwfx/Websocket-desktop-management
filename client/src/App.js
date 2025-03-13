import React from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import "./App.css";
import "./styles/auth.css";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

function App() {
	return (
		<AuthProvider>
			<Router>
				<div className="App">
					<Routes>
						{/* Public routes */}
						<Route path="/login" element={<Login />} />
						<Route path="/register" element={<Register />} />

						{/* Protected routes */}
						<Route
							path="/dashboard"
							element={
								<ProtectedRoute>
									<Dashboard />
								</ProtectedRoute>
							}
						/>

						{/* Redirect root to login or dashboard based on auth */}
						<Route path="/" element={<Navigate to="/login" replace />} />
					</Routes>
				</div>
			</Router>
		</AuthProvider>
	);
}

export default App;
