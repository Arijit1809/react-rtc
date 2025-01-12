import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type WebRTCStatsChartProps = {
	rtcConnection: RTCPeerConnection;
};

const WebRTCStatsChart: React.FC<WebRTCStatsChartProps> = ({ rtcConnection }) => {
	const [statsData, setStatsData] = useState({
		inboundBitrate: [] as Array<{ timestamp: string, value: number }>,
		outboundBitrate: [] as Array<{ timestamp: string, value: number }>,
		packetLoss: [] as Array<{ timestamp: string, value: number }>,
		jitter: [] as Array<{ timestamp: string, value: number }>,
		rtt: [] as Array<{ timestamp: string, value: number }>,
		frameRate: [] as Array<{ timestamp: string, value: number }>,
	});

	useEffect(() => {
		// Fetch stats every 1 second
		const interval = setInterval(async () => {
			const stats = await rtcConnection.getStats();
			let inboundBitrate = 0;
			let outboundBitrate = 0;
			let packetLoss = 0;
			let jitter = 0;
			let rtt = 0;
			let frameRate = 0;

			stats.forEach((report) => {
				if (report.type === 'inbound-rtp' && report.kind === 'video') {
					inboundBitrate = report.bytesReceived;
					packetLoss = report.packetsLost;
					jitter = report.jitter;
					frameRate = report.framesDecoded;
				}
				if (report.type === 'outbound-rtp' && report.kind === 'video') {
					outboundBitrate = report.bytesSent;
				}
				if (report.type === 'candidate-pair' && report.selected) {
					rtt = report.currentRoundTripTime;
				}
			});

			// Update chart data for each stat
			const now = new Date().toLocaleTimeString();
			setStatsData((prevStats) => {
				const newStats = {
					inboundBitrate: [
						...prevStats.inboundBitrate,
						{ timestamp: now, value: inboundBitrate },
					],
					outboundBitrate: [
						...prevStats.outboundBitrate,
						{ timestamp: now, value: outboundBitrate },
					],
					packetLoss: [
						...prevStats.packetLoss,
						{ timestamp: now, value: packetLoss },
					],
					jitter: [
						...prevStats.jitter,
						{ timestamp: now, value: jitter },
					],
					rtt: [
						...prevStats.rtt,
						{ timestamp: now, value: rtt },
					],
					frameRate: [
						...prevStats.frameRate,
						{ timestamp: now, value: frameRate },
					],
				};

				// Keep only the last 20 data points
				for (const key in newStats) {
					if (newStats[key as keyof typeof newStats].length > 20) {
						newStats[key as keyof typeof newStats].shift();
					}
				}

				return newStats;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [rtcConnection]);

	const renderChart = (dataKey: string, color: string, name: string) => (
		<ResponsiveContainer width="100%" height={300}>
			<LineChart data={statsData[dataKey as keyof typeof statsData]}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="timestamp" />
				<YAxis />
				<Tooltip />
				<Legend />
				<Line
					type="monotone"
					dataKey="value"
					stroke={color}
					activeDot={{ r: 8 }}
					name={name}
				/>
			</LineChart>
		</ResponsiveContainer>
	);

	return (
		<div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
			<h3>WebRTC Stats</h3>
			<div style={{ marginBottom: '20px' }}>
				<h4>Bitrate (Inbound & Outbound)</h4>
				{renderChart('inboundBitrate', '#0d6efd', 'Inbound Bitrate')}
				{renderChart('outboundBitrate', '#d63384', 'Outbound Bitrate')}
			</div>
			<div style={{ marginBottom: '20px' }}>
				<h4>Packet Loss & Jitter</h4>
				{renderChart('packetLoss', '#ffcc00', 'Packet Loss')}
				{renderChart('jitter', '#ff7f00', 'Jitter')}
			</div>
			<div style={{ marginBottom: '20px' }}>
				<h4>Round Trip Time (RTT) & Frame Rate</h4>
				{renderChart('rtt', '#28a745', 'RTT')}
				{renderChart('frameRate', '#6c757d', 'Frame Rate')}
			</div>
		</div>
	);
};

export default WebRTCStatsChart;