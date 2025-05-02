# Desktop Management System

## Project Overview

The Desktop Management System is a full-stack web application designed for real-time monitoring and control of remote Windows machines. It provides a comprehensive solution for computer lab administrators, IT staff, and organizations that need to manage multiple computers efficiently.

## Key Features

- **Real-time Monitoring:** Track connected machines and their status in real-time
- **Remote Control:** Send commands to remote machines, including:
  - Password management
  - Computer lock/unlock
  - Shutdown/restart
- **Computer Rental System:** Rent computers to users with automated password management
- **User Management:** Administrative panel for managing users and permissions
- **Detailed Computer Information:** View detailed information about registered computers

## System Architecture

### Components

1. **Backend Server:**

   - Node.js with Express framework
   - MongoDB for data persistence
   - Socket.IO for real-time bidirectional communication
   - JWT-based authentication and authorization

2. **Frontend Client:**

   - React.js single-page application
   - Socket.IO client for real-time updates
   - Responsive design for desktop and mobile access

3. **Agent Software:**
   - Node.js application running on Windows machines
   - Connects to the server via Socket.IO
   - Executes commands received from the server
   - Reports machine status and information to the server

### Communication Flow

1. Agent software runs on Windows machines and connects to the server
2. Server maintains a registry of connected agents (guests)
3. Administrators control agents through the web interface
4. Commands are sent from web interface → server → agent
5. Results and status updates flow from agent → server → web interface

## Data Models

### User

- Authentication credentials and personal information
- Role-based permissions (admin/user)
- Credit balance for renting computers

### Guest

- Represents a connected Windows machine
- Tracks machine details (hostname, IP, OS info)
- Connection status and history

### Computer

- Registration status and availability
- Rental information and pricing
- Current user assignment
- Password change history

### Rental

- Links users to computers
- Tracks rental duration and costs
- Manages payment and credit system

### Command Log

- Records all commands sent to remote machines
- Tracks execution status and results

## Technical Implementation

### Backend

The server is built with Express.js and uses Socket.IO for real-time communication. It provides:

- RESTful API endpoints for CRUD operations
- Socket.IO events for real-time updates
- MongoDB integration for data persistence
- JWT-based authentication and authorization
- Background processes for rental management and computer status monitoring

### Frontend

The client is built with React.js and provides:

- Dashboard for monitoring all connected machines
- Command panel for sending commands to selected machines
- User management interface for administrators
- Computer rental system for users
- Real-time updates via Socket.IO

### Agent Software

The agent software is a lightweight Node.js application that:

- Generates a unique ID for each machine
- Connects to the server using Socket.IO
- Executes commands received from the server (password changes, system operations)
- Reports machine status and information to the server
- Persists connection ID between restarts

## Security Considerations

- JWT-based authentication for secure API access
- Password hashing using bcrypt
- Role-based access control
- Secure WebSocket connections
- Password management for rented computers

## Installation and Deployment

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas cloud instance)
- Windows machines for agent deployment

### Server Deployment

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables (.env file)
4. Start the server: `npm start`

### Agent Deployment

1. Transfer the agent folder to Windows machines
2. Install Node.js if not already installed
3. Install dependencies: `npm install`
4. Configure the agent environment (.env file)
5. Start the agent: `node agent.js`
6. Set up auto-start using Task Scheduler (instructions in README)

## Environment Variables

### Server

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `PORT`: Server port (default: 5000)

### Agent

- `SERVER_URL`: URL of the backend server

## Usage Guide

### Admin Dashboard

1. **Guest Management:**

   - View all connected machines
   - Send commands to selected machines
   - Register machines as rentable computers

2. **User Management:**

   - Create, edit, and delete user accounts
   - Assign roles and permissions
   - Manage user credits

3. **Computer Management:**
   - Register connected machines as rentable computers
   - Set hourly rates and availability
   - Monitor rental status

### User Interface

1. **Computer Rental:**

   - Browse available computers
   - Rent computers using credits
   - View rental history and status

2. **Account Management:**
   - View and edit profile information
   - Check credit balance
   - View rental history

## Development Roadmap

1. **Phase 1:** Core functionality

   - Basic agent connection
   - Command execution
   - Admin dashboard

2. **Phase 2:** Rental system

   - Computer registration
   - User credits
   - Rental management

3. **Phase 3:** Enhanced features
   - Advanced remote control
   - Reporting and analytics
   - Mobile app support

## Troubleshooting

### Common Issues

1. **Agent Connection Problems:**

   - Verify network connectivity
   - Check firewall settings
   - Ensure correct server URL in agent configuration

2. **MongoDB Connection Issues:**

   - Verify MongoDB service is running
   - Check connection string in environment variables
   - Ensure network allows MongoDB connections

3. **Command Execution Failures:**
   - Verify agent is running with administrative privileges
   - Check Windows security settings
   - Verify command compatibility with Windows version

## Contributing

Guidelines for contributing to the project:

1. Fork the repository
2. Create a feature branch
3. Make changes and test
4. Submit a pull request with detailed description

## License

This project is licensed under the MIT License - see the LICENSE file for details.
