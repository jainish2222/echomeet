import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faVideo,
  faVideoSlash,
  faMicrophone,
  faMicrophoneSlash,
} from "@fortawesome/free-solid-svg-icons";

export default function VideoBox({
  localStream,
  remoteStream,
  videoActive,
  onStartVideo,
  onStopVideo,
  name,
  partnerName,
}) {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true); // ✅ Mic muted by default

  /* 🎥 Attach local stream */
  useEffect(() => {
    if (localRef.current) {
      localRef.current.srcObject = localStream || null;
      if (localStream) localRef.current.play().catch(() => {});
    }
  }, [localStream]);

  /* 🎥 Attach remote stream */
  useEffect(() => {
    if (remoteRef.current) {
      remoteRef.current.srcObject = remoteStream || null;
      if (remoteStream) remoteRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  /* 🎙️ Ensure correct mute state based on video */
  useEffect(() => {
    if (!localStream) return;

    const audioTracks = localStream.getAudioTracks();

    // Always start with mic muted
    if (!videoActive) {
      audioTracks.forEach((t) => (t.enabled = false));
      setIsMuted(true);
    } else {
      // When video turns ON, mic stays muted until user un-mutes manually
      audioTracks.forEach((t) => (t.enabled = false));
      setIsMuted(true);
    }
  }, [videoActive, localStream]);

  /* 🎛️ Manual mute toggle (only when video is ON) */
  const handleToggleMute = () => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    const newMuted = !isMuted;
    audioTracks.forEach((t) => (t.enabled = !newMuted));
    setIsMuted(newMuted);
  };

  return (
    <div className="flex flex-col gap-5 w-full px-6 md:px-0">
      <div className="flex flex-col gap-4">
        {/* 👤 Local Video */}
        <div
          className="rounded-2xl overflow-hidden aspect-video relative border shadow-lg"
          style={{
            background: "rgb(var(--surface))",
            borderColor: "rgb(var(--border))",
          }}
        >
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div
            className="absolute bottom-2 left-2 text-[11px] px-2 py-1 rounded"
            style={{
              background: "rgba(var(--bg),0.6)",
              border: "1px solid rgb(var(--border))",
              color: "rgb(var(--text))",
            }}
          >
            You {name ? `(${name})` : ""}
          </div>

          {/* Mic status indicator */}
          <div
            className="absolute top-2 right-2 px-2 py-1 rounded text-xs flex items-center gap-1"
            style={{
              background: "rgba(var(--bg),0.6)",
              border: "1px solid rgb(var(--border))",
            }}
          >
            <FontAwesomeIcon
              icon={isMuted ? faMicrophoneSlash : faMicrophone}
              className={isMuted ? "text-red-400" : "text-green-400"}
            />
            <span style={{ color: "rgb(var(--muted))" }}>
              {isMuted ? "Muted" : "On"}
            </span>
          </div>
        </div>

        {/* 🧑 Partner Video */}
        <div
          className="rounded-2xl overflow-hidden aspect-video relative border shadow-lg"
          style={{
            background: "rgb(var(--surface))",
            borderColor: "rgb(var(--border))",
          }}
        >
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div
            className="absolute bottom-2 left-2 text-[11px] px-2 py-1 rounded"
            style={{
              background: "rgba(var(--bg),0.6)",
              border: "1px solid rgb(var(--border))",
              color: "rgb(var(--text))",
            }}
          >
            {partnerName || "Partner"}
          </div>
        </div>
      </div>

      {/* 🎛️ Controls */}
      <div className="flex items-center gap-3 justify-center mt-3 flex-wrap">
        {!videoActive ? (
          <button
            onClick={onStartVideo}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition"
            style={{
              background: "rgb(var(--accent-500))",
              color: "#111",
            }}
          >
            <FontAwesomeIcon icon={faVideo} />
            <span>Start Video</span>
          </button>
        ) : (
          <button
            onClick={onStopVideo}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition"
            style={{
              background: "#dc2626",
              color: "#fff",
            }}
          >
            <FontAwesomeIcon icon={faVideoSlash} />
            <span>Stop Video</span>
          </button>
        )}

        {/* 🎙️ Mute/Unmute (only active when video on) */}
        <button
          onClick={handleToggleMute}
          disabled={!videoActive}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
            !videoActive ? "opacity-60 cursor-not-allowed" : ""
          }`}
          style={{
            background: "rgb(var(--surface))",
            border: "1px solid rgb(var(--border))",
            color: isMuted ? "#f87171" : "#4ade80",
          }}
        >
          <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} />
          <span>{isMuted ? "Unmute" : "Mute"}</span>
        </button>
      </div>
    </div>
  );
}
