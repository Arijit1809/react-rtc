import { useEffect, useRef, useState } from "react";
import socket from "./Socket"; // Your socket setup here

// Define types for peer connections and streams
type PeerStreams = { [peerId: string]: MediaStream };

const iceConfig = {
	iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const MultiCall = () => {
	return (
		
	)
};

const VideoTile = () => {
	return (
		<div>

		</div>
	)
}

export default MultiCall;

class Peer {
	fromPeerId: string; // Local peer ID
	toPeerId: string; // Remote peer ID
	localStream: MediaStream | null; // Local media stream
	remoteStream: MediaStream | null; // Remote media stream
	iceCandidates: RTCIceCandidate[]; // Array of ICE candidates
	rtcConnection: RTCPeerConnection; // The RTC connection instance

	constructor({
		fromPeerId,
		toPeerId,
		localStream,
	}: {
		fromPeerId: string;
		toPeerId: string;
		localStream: MediaStream | null;
	}) {
		this.fromPeerId = fromPeerId;
		this.toPeerId = toPeerId;
		this.localStream = localStream;
		this.remoteStream = null;
		this.iceCandidates = [];

		// Initialize RTCPeerConnection
		this.rtcConnection = new RTCPeerConnection(iceConfig);

		// Add local tracks to the connection
		if (localStream) {
			localStream.getTracks().forEach((track) => {
				this.rtcConnection.addTrack(track, localStream);
			});
		}

		// Handle remote tracks
		this.rtcConnection.ontrack = (event: RTCTrackEvent) => {
			if (!this.remoteStream) {
				this.remoteStream = new MediaStream();
			}
			event.streams[0].getTracks().forEach((track) => {
				this.remoteStream?.addTrack(track);
			});
		};

		// Handle ICE candidates
		this.rtcConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
			if (event.candidate) {
				this.iceCandidates.push(event.candidate);
			}
		};
	}

	// Create an SDP offer
	async createOffer(): Promise<RTCSessionDescriptionInit> {
		const offer = await this.rtcConnection.createOffer();
		await this.rtcConnection.setLocalDescription(offer);
		return offer;
	}

	// Handle incoming SDP offer
	async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
		const remoteDesc = new RTCSessionDescription(offer); // Variable for remote description
		await this.rtcConnection.setRemoteDescription(remoteDesc);

		const answer = await this.rtcConnection.createAnswer(); // Variable for answer
		await this.rtcConnection.setLocalDescription(answer);
		return answer;
	}

	// Handle incoming SDP answer
	async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
		const remoteDesc = new RTCSessionDescription(answer); // Variable for remote description
		await this.rtcConnection.setRemoteDescription(remoteDesc);
	}

	// Add ICE candidate
	async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
		try {
			const iceCandidate = new RTCIceCandidate(candidate); // Variable for ICE candidate
			await this.rtcConnection.addIceCandidate(iceCandidate);
		} catch (error) {
			console.error('Failed to add ICE candidate:', error);
		}
	}
}