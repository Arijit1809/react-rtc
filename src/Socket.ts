import { io } from "socket.io-client";

const socket = io("http://localhost:8000"); // Replace with your server URL if different

export default socket;