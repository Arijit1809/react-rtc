import { io } from "socket.io-client";

const socket = io("https://game-server-z3yz.onrender.com"); // Replace with your server URL if different

export default socket;