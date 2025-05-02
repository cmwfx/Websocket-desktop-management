import React, { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

// Create the context
const SocketContext = createContext(null);

// Use relative URLs in production
const BACKEND_URL =
	process.env.NODE_ENV === "production"
		? ""
		: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

// Socket provider component
export const SocketProvider = ({ children }) => {
	const [socket, setSocket] = useState(null);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		// Initialize socket connection
		const socketInstance =
			process.env.NODE_ENV === "production" ? io() : io(BACKEND_URL);

		setSocket(socketInstance);

		// Set up event listeners
		socketInstance.on("connect", () => {
			console.log("Socket connected");
			setIsConnected(true);
		});

		socketInstance.on("disconnect", () => {
			console.log("Socket disconnected");
			setIsConnected(false);
		});

		// Clean up on unmount
		return () => {
			console.log("Cleaning up socket connection");
			socketInstance.disconnect();
		};
	}, []);

	// Values to be provided by the context
	const contextValue = {
		socket,
		isConnected,
	};

	return (
		<SocketContext.Provider value={contextValue}>
			{children}
		</SocketContext.Provider>
	);
};

// Custom hook to use the socket context
export const useSocket = () => {
	const context = useContext(SocketContext);
	if (!context) {
		throw new Error("useSocket must be used within a SocketProvider");
	}
	return context;
};

export default SocketContext;
