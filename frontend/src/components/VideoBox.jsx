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
  const [isMuted, setIsMuted] = useState(false);

  // Attach local stream
  useEffect(() => {
    if (localRef.current) {
      localRef.current.srcObject = localStream || null;
      if (localStream) localRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteRef.current) {
      remoteRef.current.srcObject = remoteStream || null;
      if (remoteStream) remoteRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // 🎙️ Toggle microphone mute/unmute
  const handleToggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-3">
        {/* Local Video */}
        <div className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow border border-gray-800">
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-[11px] bg-black/40 px-2 py-1 rounded border border-gray-700">
            You {name ? `(${name})` : ""}
          </div>
          {/* Mic status indicator */}
          <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded text-xs border border-gray-700 flex items-center gap-1">
            <FontAwesomeIcon
              icon={isMuted ? faMicrophoneSlash : faMicrophone}
              className={isMuted ? "text-red-400" : "text-green-400"}
            />
            <span>{isMuted ? "Muted" : "On"}</span>
          </div>
        </div>

        {/* Remote Video */}
        <div className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow border border-gray-800">
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-[11px] bg-black/40 px-2 py-1 rounded border border-gray-700">
            {partnerName || "Partner"}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 justify-center mt-2">
        {!videoActive ? (
          <button
            onClick={onStartVideo}
            className="btn flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition"
          >
            <FontAwesomeIcon icon={faVideo} />
            <span>Start Video</span>
          </button>
        ) : (
          <button
            onClick={onStopVideo}
            className="btn-ghost flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition"
          >
            <FontAwesomeIcon icon={faVideoSlash} />
            <span>Stop Video</span>
          </button>
        )}

        {/* 🎙️ Mute / Unmute button */}
        <button
          onClick={handleToggleMute}
          className={`btn-ghost flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            isMuted
              ? "bg-gray-800 text-red-400 hover:bg-gray-700"
              : "bg-gray-800 text-green-400 hover:bg-gray-700"
          }`}
        >
          <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} />
          <span>{isMuted ? "Unmute Mic" : "Mute Mic"}</span>
        </button>
      </div>
    </div>
  );
}
