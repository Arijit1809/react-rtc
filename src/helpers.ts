import { Peer } from "./Call";

async function getMaxResolution(): Promise<{ maxWidth: number, maxHeight: number }> {
	const devices = await navigator.mediaDevices.enumerateDevices();

	// Filter for video input devices
	const videoDevices = devices.filter(device => device.kind === 'videoinput');

	let maxWidth = 0;
	let maxHeight = 0;

	for (const device of videoDevices) {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { deviceId: device.deviceId }
			});

			const track = stream.getVideoTracks()[0];
			const capabilities = track.getCapabilities();

			// Determine the max width and height based on the capabilities of the camera
			maxWidth = Math.max(maxWidth, capabilities.width?.max ?? 0);
			maxHeight = Math.max(maxHeight, capabilities.height?.max ?? 0);

			stream.getTracks().forEach(track => track.stop()); // Stop the stream after getting capabilities
		} catch (error) {
			console.error('Error accessing device:', device.label, error);
		}
	}

	return { maxWidth, maxHeight };
}
// Helper function to get the available audio, video input, video output, and audio output devices
export async function getAvailableMediaDevices(): Promise<{
	audioInput: MediaDeviceInfo[];
	audioOutput: MediaDeviceInfo[];
	videoInput: MediaDeviceInfo[];
}> {
	const devices = await navigator.mediaDevices.enumerateDevices();
	const audioInput = devices.filter(device => device.kind === 'audioinput');
	const audioOutput = devices.filter(device => device.kind === 'audiooutput');
	const videoInput = devices.filter(device => device.kind === 'videoinput');

	return {
		audioInput,
		audioOutput,
		videoInput,
	};
}

async function getLocalStream(): Promise<MediaStream> {
	const constraints = {
		video: true,
		audio: true
	};

	try {
		return await navigator.mediaDevices.getUserMedia(constraints);
	} catch (error) {
		console.error('Error accessing media devices:', error);
		throw error;
	}
}

async function getStreamFromDevice(deviceId: string): Promise<MediaStream> {
	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: { deviceId: { exact: deviceId } },
		});
		return stream;
	} catch (error) {
		console.error('Error accessing video device:', error);
		throw error;  // Rethrow the error if unable to access the device
	}
}

export async function updateVideoTrackForAllPeers(peers: Peer[], deviceId: string): Promise<MediaStream> {
	// Get the new stream based on the selected device
	const newStream = await getStreamFromDevice(deviceId);
	console.log('New video stream:', newStream);
	// Update the video track for each peer
	for (const peer of peers) {
		await peer.updateVideoTrack(newStream);
	}

	console.log('Updated video track for all peers.');

	return newStream;
}