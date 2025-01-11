/* eslint-disable @typescript-eslint/no-unused-vars */
import socket from './Socket'
import './App.scss'
import { useEffect } from 'react'
import { useState } from 'react'
import { useRef } from 'react'
import MultiCall from './Call'

// Extend the existing RTCPeerConnection interface
declare global {
  interface RTCPeerConnection {
    peerId?: string;
  }
}

function App() {
  console.log(socket.id)
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Listen for connection events
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Clean up listeners on unmount
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);
  return (
    <div className='app'>
      {/* <Call /> */}
      <MultiCall/>
    </div>
  )
}

export default App

const Call: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  const [isJoined, setIsJoined] = useState<boolean>(false);

  // STUN servers for WebRTC
  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }, // Google's public STUN server
    ],
  };

  useEffect(() => {
    // Handle incoming offer
    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      await createAnswer(offer);
    };

    // Handle incoming answer
    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(answer);
      }
    };

    // Handle incoming ICE candidate
    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(candidate);
      }
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      // Clean up on component unmount
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
    };
  }, []);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize PeerConnection
      peerConnection.current = new RTCPeerConnection(iceServers);
      // Add local stream to PeerConnection
      stream.getTracks().forEach((track) => {
        peerConnection.current?.addTrack(track, stream);
      });
      peerConnection.current.peerId = "23";
      // Handle remote stream
      peerConnection.current.ontrack = (event: RTCTrackEvent) => {
        const target = event.target as RTCPeerConnection;
        console.log(target.peerId);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      //MARK: Emit ICE Candidate
      /**
       * onicecandidate finds and exposes YOUR possible connection routes.
       * Triggered when the connection finds an ICE candidate
       * (a possible network route for data). These candidates are sent to the 
       * remote peer via the signaling server (e.g., Socket.IO) to help establish 
       * a direct peer-to-peer connection.
       */
      peerConnection.current.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          socket.emit("ice-candidate", event.candidate);
        }
      };

      setIsJoined(true);
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  const createOffer = async () => {
    if (peerConnection.current) {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      // Send the offer to the other peer
      socket.emit("offer", offer);
    }
  };

  const createAnswer = async (offer: RTCSessionDescriptionInit) => {
    if (peerConnection.current) {
      await peerConnection.current.setRemoteDescription(offer);

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      // Send the answer to the other peer
      socket.emit("answer", answer);
    }
  };

  return (
    <div>
      <h1>Mesh Network Video Call</h1>
      {!isJoined ? (
        <button onClick={startLocalStream}>Join</button>
      ) : (
        <button onClick={createOffer}>Start Call</button>
      )}
      <div>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          style={{ width: "300px", border: "1px solid white" }}
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          style={{ width: "300px", border: "1px solid white" }}
        />
      </div>
    </div>
  );
};
