import { io } from "socket.io-client";

//TODO: Should be initiated from environment variables
const url = "https://game-server-z3yz.onrender.com"; // Replace with your server URL if different
// const url = "http://localhost:8000";	// Replace with your server URL if different

const socket = io(url); // Replace with your server URL if different

export default socket;