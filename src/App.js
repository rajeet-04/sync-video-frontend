import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("sync-video-backend.railway.internal"); // Replace with your backend URL

export default function SyncStream() {
  const [gdriveLink, setGdriveLink] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    socket.on("sync", ({ action, time }) => {
      if (player) {
        if (action === "play") player.play();
        else if (action === "pause") player.pause();
        else if (action === "seek") player.currentTime = time;
      }
    });
  }, [player]);

  const handleGenerateLink = () => {
    const id = Math.random().toString(36).substring(7);
    setRoomId(id);
    setVideoUrl(convertGDriveLink(gdriveLink));
    socket.emit("create-room", id);
  };

  const handleVideoEvent = (event) => {
    if (!roomId) return;
    const time = player.currentTime;
    socket.emit("sync", { roomId, action: event, time });
  };

  return (
      <div>
        <h1>Sync Video Streaming</h1>
        {!roomId ? (
            <>
              <input
                  type="text"
                  placeholder="Paste Google Drive Link"
                  value={gdriveLink}
                  onChange={(e) => setGdriveLink(e.target.value)}
              />
              <button onClick={handleGenerateLink}>Generate Watch Link</button>
            </>
        ) : (
            <>
              <p>Share this link: {window.location.href}?room={roomId}</p>
              <video
                  src={videoUrl}
                  controls
                  ref={(ref) => setPlayer(ref)}
                  onPlay={() => handleVideoEvent("play")}
                  onPause={() => handleVideoEvent("pause")}
                  onSeeked={() => handleVideoEvent("seek")}
              />
            </>
        )}
      </div>
  );
}

function convertGDriveLink(link) {
  const match = link.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/uc?id=${match[1]}` : link;
}
