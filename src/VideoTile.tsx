import { getUser, getUserName, Peer } from "./Call"
import VideoHealth from "./VideoHealth"


const VideoTile = ({ peer }: { peer: Peer }) => {
	const peerId = peer.peerId
	const name = getUserName(peerId)
	const user = getUser(peerId)

	return (
		<div className="remote-video-tile"
			style={{ backgroundColor: user?.color }}
		>
			<div className="remote-video-tile__info">
				<h3>{name}</h3>
				<VideoHealth rtcConnection={peer.rtcConnection} />
			</div>
			{peer.remoteStream && (
				<video
					ref={(ref) => ref && (ref.srcObject = peer.remoteStream)}
					autoPlay
					playsInline
					className="remote-video"
				/>
			)}
		</div>
	)
}

export default VideoTile