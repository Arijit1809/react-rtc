/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';

type VideoHealthProps = {
	rtcConnection: RTCPeerConnection;
};

const VideoHealth: React.FC<VideoHealthProps> = ({ rtcConnection }) => {
	const [videoStats, setVideoStats] = useState<{ width: number; height: number; frameRate: number; resolutionLabel: string }>({
		width: 0,
		height: 0,
		frameRate: 0,
		resolutionLabel: '',
	});

	const getResolutionLabel = (width: number, height: number) => {
		if (width <= 640 && height <= 360) return '360p';
		if (width <= 1280 && height <= 720) return '720p';
		if (width <= 1920 && height <= 1080) return '1080p';
		if (width <= 2560 && height <= 1440) return '1440p';
		if (width <= 3840 && height <= 2160) return '4K';
		return `${width}x${height}`; // If it doesn't match any known resolution, show custom resolution
	};

	useEffect(() => {
		// Fetch stats every 1 second
		const interval = setInterval(async () => {
			const stats = await rtcConnection.getStats();
			let width = 0;
			let height = 0;
			let frameRate = 0;
			// console.log(stats)
			const reports: any[] = []
			// printOutboundRTPStats(stats)
			stats.forEach((report) => {
				reports.push(report)

				if (report.type === 'media-source' && report.kind === 'video') {
					// console.log(report)
					width = report.width || 0;
					height = report.height || 0;
					frameRate = report.framesPerSecond || 0;
				}
			});
			// console.log(reports)
			// Get resolution label
			const resolutionLabel = getResolutionLabel(width, height);

			// Update the video stats
			setVideoStats({ width, height, frameRate, resolutionLabel });
		}, 1000);

		return () => clearInterval(interval); // Clean up on component unmount
	}, [rtcConnection]);

	return (
		<div className='video-health'>
			<p>{videoStats.resolutionLabel}</p>
			<p>{videoStats.frameRate} FPS</p>
		</div>
	);
};

export default VideoHealth;

function printOutboundRTPStats(report: RTCStatsReport) {
	const networkStats = {
		packetsReceived: 0,
		fractionLost: 0,
		jitter: 0,
		roundTripTime: 0,
	};
	for (const [key, value] of report) {
		if (value.type === "outbound-rtp") {
			const s = value as RTCOutboundRtpStreamStats;
			console.log("------ Outbound RTP Stats ------");
			console.log(`Packets Sent: ${s.packetsSent}`);
			console.log(`Bytes Sent: ${s.bytesSent}`);
			console.log(`Target Bitrate: ${s.targetBitrate}`);
			console.log("--------------------------------");
		} else if (value.type === "remote-outbound-rtp") {
			console.log("------ Remote Outbound RTP Stats ------");
			console.log(`Packets Sent: ${value.packetsSent}`);
			console.log(`Bytes Sent: ${value.bytesSent}`);
			console.log(`Target Bitrate: ${value.targetBitrate}`);
			console.log(`Fraction Lost: ${value.fractionLost}`);
			console.log(`Jitter: ${value.jitter}`);
			console.log(`Round Trip Time: ${value.roundTripTime}`);
			console.log("---------------------------------------");
		}
		if (value.type === "remote-inbound-rtp" && value.kind === "video") {
			console.log('remote-inbound-rtp', value)
			const v = value as RTCInboundRtpStreamStats;
			networkStats.packetsReceived = value.packetsReceived;
			networkStats.fractionLost = value.fractionLost;
			networkStats.jitter = value.jitter;
			networkStats.roundTripTime = value.roundTripTime;
		}
	}
	console.log(networkStats)
}