# Desktop Management System

A real-time desktop management system for monitoring and controlling remote machines.

## Recent Updates

- **Combined Computer and Guest Management:** All registered computers now appear in the Connected Guests tab with proper identification and management capabilities
- **Enhanced Guest Manager:** Added detailed views for guests with expandable information panels
- **Improved Refresh Functionality:** Added manual refresh button and automatic refresh of guests and computers
- **Better Status Indicators:** Visual indicators for online status and computer status
- **Reset Computer Status:** Added ability to reset unavailable or offline computers to available status

## Features

- **Real-time Monitoring:** Track connected guests and their status in real-time
- **Remote Control:** Send commands to remote machines
- **Computer Rental System:** Rent computers to users with automatic password management
- **User Management:** Admin panel for managing users and permissions
- **Detailed Computer Information:** View detailed information about registered computers

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Configure environment variables:

   - Create a `.env` file in the server directory with:
     ```
     MONGODB_URI=your_mongodb_connection_string
     JWT_SECRET=your_jwt_secret
     PORT=5000
     ```

4. Start the development servers:

   ```bash
   # Start the server
   cd server
   npm run dev

   # In a new terminal, start the client
   cd client
   npm start
   ```

## Usage

1. **Admin Dashboard:**

   - View and manage connected guests
   - Send commands to remote machines
   - Manage user accounts and permissions

2. **User Dashboard:**
   - View available computers for rent
   - Rent computers for a specified duration
   - Manage active rentals

## Architecture

The system consists of:

- **Server:** Node.js backend with Express, Socket.io, and MongoDB
- **Client:** React frontend for both admin and user interfaces
- **Guest Agents:** Applications running on remote machines that connect to the server

## Project Structure

- **server/**: Express.js backend with Socket.IO for real-time communication
- **client/**: React.js frontend for the admin dashboard
- **agent/**: Node.js agent to run on client machines

## Setup Instructions

### Server Setup

```bash
cd server
npm install
npm start
```

### Client Setup

```bash
cd client
npm install
npm start
```

### Agent Setup

-Transfer the agent folder to the Windows machine you want to manage.
-Install Node.js on the Windows machine if it's not already installed.
-Install dependencies

```bash
cd agent
npm install
node agent.js
```

### Agent Auto Start

-Create a batch file (e.g., start-agent.bat) in your agent directory

```bash
   @echo off
   cd /d file location
   node agent.js
```

### Open Task Scheduler:

## Press Win + R, type taskschd.msc and press Enter

### Create a new task:

## Click "Create Task..." in the right panel

## General tab:

# Name: "Desktop Management Agent"

# Select "Run whether user is logged on or not"

# Select "Run with highest privileges"

## Triggers tab:

# Click "New..."

# Begin the task: "At startup"

# Click OK

## Actions tab:

# Click "New..."

# Action: "Start a program"

# Program/script: Browse to your start-agent.bat file

# Click OK

## Conditions tab:

# Uncheck "Start the task only if the computer is on AC power"

## Settings tab:

# Check "Allow task to be run on demand"

# Check "Run task as soon as possible after a scheduled start is missed"

# Click OK

### Enter your Windows password when prompted

## Technologies Used

- MongoDB: Database for storing machine information and logs
- Express.js: Backend framework
- React.js: Frontend framework
- Node.js: Runtime environment
- Socket.IO: Real-time bidirectional communication

## Development Plan

1. Set up the server with Express and Socket.IO
2. Create the agent for client machines
3. Develop the React admin dashboard
4. Integrate all components
5. Test and deploy
