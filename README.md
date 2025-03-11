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
