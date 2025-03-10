# Desktop Management Web App

A MERN stack application for managing desktop computers remotely using WebSockets.

## Project Structure

- **server/**: Express.js backend with Socket.IO for real-time communication
- **client/**: React.js frontend for the admin dashboard
- **agent/**: Node.js agent to run on client machines

## Features

- Real-time monitoring of connected machines
- Remote password management
- Remote locking/unlocking of machines
- Session management and scheduling

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
```bash
cd agent
npm install
node agent.js
```

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