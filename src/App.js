import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("wss://tramway.proxy.rlwy.net:32042", {
  transports: ["websocket", "polling"], // Force WebSocket + Polling fallback
  path: "/socket.io/",
});


export default function SyncStream() {
  const [gdriveLink, setGdriveLink] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const playerRef = useRef(null);

  // Join room if accessed via shared link
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromURL = urlParams.get("room");
    if (roomIdFromURL) {
      setRoomId(roomIdFromURL);
      socket.emit("join-room", roomIdFromURL);
    }
  }, []);

  // Sync video play/pause/seek
  useEffect(() => {
    socket.on("sync", ({ action, time }) => {
      if (playerRef.current) {
        if (action === "play") playerRef.current.play();
        else if (action === "pause") playerRef.current.pause();
        else if (action === "seek") playerRef.current.currentTime = time;
      }
    });
  }, []);

  // Generate room link
  const handleGenerateLink = () => {
    const id = Math.random().toString(36).substring(7);
    setRoomId(id);
    setVideoUrl(convertGDriveLink(gdriveLink));
    socket.emit("create-room", id);
  };

  // Handle video events
  const handleVideoEvent = (event) => {
    if (!roomId || !playerRef.current) return;
    const time = playerRef.current.currentTime;
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
              <p>Share this link: {window.location.origin}?room={roomId}</p>
              <video
                  src={videoUrl}
                  controls
                  ref={playerRef}
                  onPlay={() => handleVideoEvent("play")}
                  onPause={() => handleVideoEvent("pause")}
                  onSeeked={() => handleVideoEvent("seek")}
              />
            </>
        )}
      </div>
  );
}

// Convert Google Drive Link
function convertGDriveLink(link) {
  const match = link.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/uc?id=${match[1]}` : link;
}
