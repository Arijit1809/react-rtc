import { useEffect, useRef, useState } from "react";
import socket from "./Socket"; // Your socket setup here
import VideoTile from "./VideoTile";

//? BASIC ICE CONFIG - ONLY WORKS LOCALLY DUE TO NAT
const iceConfigGoogleSTUN = {
	iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

//? ADVANCED ICE CONFIG - WORKS LOCALLY AND INTERNET
const iceConfigOpenRelayTURN = {
	iceServers: [
		{
			urls: "stun:stun.relay.metered.ca:80",
		},
		{
			urls: "turn:global.relay.metered.ca:80",
			username: "3d55ed434071d63c3fc15285",
			credential: "zYll+T1ckVz3mX+E",
		},
		{
			urls: "turn:global.relay.metered.ca:80?transport=tcp",
			username: "3d55ed434071d63c3fc15285",
			credential: "zYll+T1ckVz3mX+E",
		},
		{
			urls: "turn:global.relay.metered.ca:443",
			username: "3d55ed434071d63c3fc15285",
			credential: "zYll+T1ckVz3mX+E",
		},
		{
			urls: "turns:global.relay.metered.ca:443?transport=tcp",
			username: "3d55ed434071d63c3fc15285",
			credential: "zYll+T1ckVz3mX+E",
		},
	],
}

// const iceConfig = iceConfigOpenRelayTURN;
const iceConfig = iceConfigGoogleSTUN;

type PeerID = number;

const users: { id: PeerID, name: string, color: string }[] = [
	{ id: 1, name: 'Bob', color: 'red' },
	{ id: 2, name: 'Alice', color: 'blue' },
	// { id: 3, name: 'Charlie', color: 'green' },
	// { id: 4, name: 'David', color: 'yellow' },
];

export const getUserName = (id: PeerID) => {
	return users.find(user => user.id === id)?.name || 'Unknown User';
}

export const getUser = (id: PeerID) => {
	return users.find(user => user.id === id);
}

function changeTabTitle(newTitle: string) {
	document.title = newTitle;
}

// Function to apply the filter to the video stream
function applyVideoFilter(track: MediaStreamTrack, filterType: string): Promise<MediaStream> {
	return new Promise((resolve, reject) => {
		const canvas = document.createElement("canvas");
		canvas.style.visibility = 'hidden'
		const context = canvas.getContext("2d");
		if (!context) {
			reject("Unable to get canvas context");
			return;
		}

		const videoElement = document.createElement("video");
		videoElement.srcObject = new MediaStream([track]);
		videoElement.play();

		//! without video.onmetadataloaded it makes the aspect ratio weird, check the text one for more info

		// Apply filter on each frame
		const applyFilter = () => {
			context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

			// Apply filter based on the filterType
			if (filterType === "grayscale") {
				context.filter = "grayscale(100%)";
			} else if (filterType === "sepia") {
				context.filter = "sepia(100%)";
			} else if (filterType === "hue-rotate") {
				context.filter = "hue-rotate(90deg)";
			}

			// Redraw with the filter applied
			context.drawImage(canvas, 0, 0);

			// Request next frame
			requestAnimationFrame(applyFilter);
		};

		applyFilter();

		// Capture the stream with the filter applied
		const filteredStream = canvas.captureStream();
		const filteredTrack = filteredStream.getVideoTracks()[0];

		// Resolve with the filtered stream
		resolve(new MediaStream([filteredTrack]));
	});
}

function applyTextOverlay(videoElement: HTMLVideoElement, canvas: HTMLCanvasElement, track: MediaStreamTrack, text: string): MediaStream {
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Unable to get canvas context");
	}
	videoElement.srcObject = new MediaStream([track]);

	// Wait until the video metadata is loaded (i.e., video dimensions are available)
	videoElement.onloadedmetadata = () => {
		canvas.width = videoElement.videoWidth;
		canvas.height = videoElement.videoHeight;
		videoElement.play();
		// Function to draw the video frame and overlay rotated text
		const applyOverlay = () => {
			// Clear the canvas before redrawing
			context.clearRect(0, 0, canvas.width, canvas.height);
			// Draw the current video frame on the canvas
			context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
			context.font = '100px Arial'; // Large text size
			context.fillStyle = 'red'; // Text color
			context.fillText(text, 50, 100); // Center the text and position it
			// Request next frame
			requestAnimationFrame(applyOverlay);
		};

		// Start the overlay loop by calling applyOverlay once
		// requestAnimationFrame(applyOverlay);
		applyOverlay()
	};

	// Capture the stream with the text overlay
	const filteredStream = canvas.captureStream(30); // Capture at 30fps
	return new MediaStream([filteredStream.getVideoTracks()[0]]);
}

const MultiCall = () => {
	const localStream = useRef<MediaStream | null>(null);
	const localVideoRef = useRef<HTMLVideoElement | null>(null);
	const [peers, setPeers] = useState<Peer[]>([]); // Store peer objects
	const [myPeerId, setMyPeerId] = useState<PeerID | null>(null);


	//? FOR FILTER VIDEO ELEMENT
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	// Initialize local media stream (camera and microphone)
	//* THIS IS THE BASIC VERSION
	// const getLocalStream = async () => {
	// 	try {
	// 		const stream = await navigator.mediaDevices.getUserMedia({
	// 			video: true,
	// 			audio: true,
	// 		});
	// 		if (localVideoRef.current) {
	// 			localVideoRef.current.srcObject = stream;
	// 		}
	// 		localStream.current = stream
	// 	} catch (error) {
	// 		console.error("Error accessing media devices.", error);
	// 	}
	// };

	//*ADVANCED FILTER VERSION
	const getLocalStream = async (peerId: PeerID) => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true,
			});

			if (localVideoRef.current) {
				localVideoRef.current.srcObject = stream;
			}

			// if (!videoRef.current || !canvasRef.current) return

			// Apply filter to the video stream before assigning it
			// const filteredStream = await applyVideoFilter(stream.getVideoTracks()[0], "grayscale");

			// Apply text overlay
			// const streamWithText = applyTextOverlay(videoRef.current, canvasRef.current, stream.getVideoTracks()[0], getUserName(peerId));
			if (localVideoRef.current) {
				if (localVideoRef.current) {
					localVideoRef.current.srcObject = stream; // Use the filtered stream
				}
			}

			localStream.current = stream;
			// localStream.current = streamWithText;
		} catch (error) {
			console.error("Error accessing media devices.", error);
		}
	};

	useEffect(() => {
		socket.on("new-peer", (peerId: PeerID) => {
			console.log(`New peer connected: ${getUserName(peerId)}`);
			createPeerConnection(peerId); // Create a new peer connection when someone joins
		});

		socket.on("offer", (offer: {
			offer: RTCSessionDescriptionInit
			fromPeerId: PeerID;
		}) => {
			console.log("Received offer from", getUserName(offer.fromPeerId), { offer });
			handleOffer(offer);
		});

		socket.on("answer", (answer: { fromPeerId: PeerID; answer: RTCSessionDescriptionInit }) => {
			console.log("Received answer from", getUserName(answer.fromPeerId), { answer });
			handleAnswer(answer);
		});

		socket.on("ice-candidate", (candidate: { fromPeerId: PeerID; candidate: RTCIceCandidateInit }) => {
			console.log("Received ICE candidate from", getUserName(candidate.fromPeerId), { candidate });
			handleIceCandidate(candidate);
		});

		return () => {
			// Cleanup listeners to avoid duplicates
			socket.off("new-peer");
			socket.off("offer");
			socket.off("answer");
			socket.off("ice-candidate");
		};
	}, [myPeerId, peers]);

	// Create peer connection
	const createPeerConnection = (peerId: PeerID) => {
		if (!localStream.current) return; // Ensure there's a local stream
		if (!myPeerId) {
			throw new Error('No local peerId')
		}
		const peer = new Peer({
			localPeerId: myPeerId,
			peerId: peerId,
			localStream: localStream.current,
			onStreamUpdate: (updatedPeerId, stream) => {
				setPeers((prevPeers) =>
					prevPeers.map((p) => {
						if (p.peerId === updatedPeerId) {
							p.updateRemoteStream(stream); // Use the method to update the remoteStream
						}
						return p;
					})
				);
			},
		});

		// Add peer connection to the state
		setPeers((prevPeers) => [...prevPeers, peer]);

		// Create offer and send it to the remote peer
		peer.createOffer().then((offer) => {
			console.log('Created offer for : ', getUserName(peerId), { offer })
			socket.emit("offer", {
				offer,
				fromPeerId: myPeerId,
				toPeerId: peerId
			});
		});
	};

	// Handle incoming offer
	const handleOffer = ({ fromPeerId: remotePeerId, offer }: { fromPeerId: PeerID, offer: RTCSessionDescriptionInit }) => {
		const peer = new Peer({
			localPeerId: myPeerId ?? 0,
			peerId: remotePeerId,
			localStream: localStream.current,
			onStreamUpdate: (updatedPeerId, stream) => {
				setPeers((prevPeers) =>
					prevPeers.map((p) => {
						if (p.peerId === updatedPeerId) {
							p.updateRemoteStream(stream); // Use the method to update the remoteStream
						}
						return p;
					})
				);
			},
		});

		// Add peer to state
		setPeers((prevPeers) => [...prevPeers, peer]);

		peer.handleOffer(offer).then((answer) => {
			console.log('Sending answer to : ', getUserName(remotePeerId), { answer })
			socket.emit("answer", {
				fromPeerId: myPeerId,
				toPeerId: remotePeerId,
				answer,
			});
		});
	};

	// Handle incoming answer
	const handleAnswer = ({ fromPeerId: remotePeerId, answer }: { fromPeerId: PeerID, answer: RTCSessionDescriptionInit }) => {
		const peer = peers.find((p) => p.peerId === remotePeerId);
		console.log('Updating answer for peer -> ', { peer })
		if (peer) {
			peer.handleAnswer(answer);
		}
	};

	// Handle incoming ICE candidate
	const handleIceCandidate = ({ fromPeerId: remotePeerId, candidate }: { fromPeerId: PeerID, candidate: RTCIceCandidateInit }) => {
		const peer = peers.find((p) => p.peerId === remotePeerId);
		if (peer) {
			peer.addIceCandidate(candidate);
		}
	};

	const joinButtons = () => {
		if (myPeerId) {
			const userChosen = users.find(user => user.id === myPeerId)
			return (
				<div className="local-user">
					<h3>Joined as {userChosen?.name ?? ""}</h3>
					{peers.length === 0 && <button onClick={() => {
						console.log('emitting that I have joined')
						socket.emit("start-call", myPeerId)
					}}>
						Start Call
					</button>}
				</div>
			)
		} else {
			return (
				<div className="join-buttons-cntnr">
					<h2>Select One</h2>
					<div className="join-buttons">
						{users.map((user) => <div key={user.id}>
							<button
								onClick={() => {
									const localPeerId = user.id
									getLocalStream(localPeerId)
									setMyPeerId(localPeerId)
									changeTabTitle(getUserName(localPeerId))
									socket.emit("join-call", localPeerId)
								}}
							>Join as {user.name}</button>
						</div>)}
					</div>
				</div>
			)
		}
	}

	return (
		<div className="multi-call">
			{/* <button className="log-peers" onClick={() => { console.log(peers) }}>
				Log Peers
			</button> */}
			{joinButtons()}
			<div className="video-grid">
				<div>
					<div
						className="local-video-tile"
						style={{ backgroundColor: users.find(user => user.id === myPeerId)?.color }}
					>
						{myPeerId && <h3>{getUserName(myPeerId)}</h3>}
						<video
							ref={localVideoRef}
							autoPlay
							playsInline
							muted
							style={{ width: "300px" }}
						/>
					</div>
				</div>
				<div>
					{peers.map((peer) => (
						<VideoTile key={peer.peerId} peer={peer} />
					))}
				</div>
			</div>
			{/* <h3>Video used for filter</h3>
			<video
				ref={videoRef}
				className="local-video-tile"
				autoPlay
				muted
				playsInline
				style={{ width: "300px" }}
			/>
			<h3>Canvas used for filter</h3>
			<canvas style={{ width: '300px' }} ref={canvasRef}></canvas> */}
		</div>
	);
};

export default MultiCall;

class Peer {
	localPeerId: PeerID; // Local peer ID
	peerId: PeerID; // Remote peer ID
	localStream: MediaStream | null; // Local media stream
	remoteStream: MediaStream | null; // Remote media stream
	iceCandidates: RTCIceCandidate[]; // Array of ICE candidates
	rtcConnection: RTCPeerConnection; // The RTC connection instance

	constructor({
		localPeerId,
		peerId,
		localStream,
		onStreamUpdate,
	}: {
		localPeerId: PeerID;
		peerId: PeerID;
		localStream: MediaStream | null;
		onStreamUpdate: (peerId: PeerID, stream: MediaStream) => void;
	}) {
		this.localPeerId = localPeerId;
		this.peerId = peerId;
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
			console.log('ontrack event', getUserName(this.peerId), event)
			if (!this.remoteStream) {
				this.remoteStream = new MediaStream();
			}
			event.streams[0].getTracks().forEach((track) => {
				this.remoteStream?.addTrack(track);
				console.log(track)
			});

			// Notify parent about the updated stream
			if (this.remoteStream) {
				onStreamUpdate(this.peerId, this.remoteStream);
			}
		};

		// Handle ICE candidates
		this.rtcConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
			console.log('onicecandidate', getUserName(this.peerId), event)
			if (event.candidate) {
				this.iceCandidates.push(event.candidate);

				// Emit the ICE candidate to the signaling server
				socket.emit("ice-candidate", {
					toPeerId: this.peerId,
					fromPeerId: this.localPeerId,
					candidate: event.candidate,
				});
			}
		};

		this.rtcConnection.oniceconnectionstatechange = () => {
			console.log('oniceconnectionstatechange', getUserName(this.peerId), this.rtcConnection.iceConnectionState)
		};

		this.rtcConnection.onconnectionstatechange = () => {
			console.log('onconnectionstatechange', getUserName(this.peerId), this.rtcConnection.connectionState)
			if (this.rtcConnection.connectionState === 'failed') {
				console.warn(`Connection with ${this.peerId} failed. Attempting to reconnect...`);
				// this.restartIce();
			}
		};
	}
	restartIce(): void {
		this.rtcConnection.restartIce();
		this.iceCandidates = [];
		console.log(`ICE Restart initiated for peer ${this.peerId}`);
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

	updateRemoteStream(stream: MediaStream) {
		this.remoteStream = stream;
	}
}

export { Peer }