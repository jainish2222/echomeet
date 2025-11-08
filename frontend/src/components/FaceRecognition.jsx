import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faMars,
  faVenus,
} from "@fortawesome/free-solid-svg-icons";

export default function FaceRecognition({ onVerified }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Loading face recognition modules...");
  const [gender, setGender] = useState(null);
  const [progress, setProgress] = useState(0);

  // 🧠 Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      ]);
      setStatus("Starting camera...");
      startVideo();
    };
    loadModels();
  }, []);

  // 📷 Start webcam
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setStatus("Align your face in the frame");
    } catch (err) {
      console.error(err);
      setStatus("Camera access denied");
    }
  };

  // 🧩 Analyze face
  useEffect(() => {
    let interval;
    const analyze = async () => {
      if (!videoRef.current) return;
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withAgeAndGender();

      if (detection) {
        const genderDetected = detection.gender === "male" ? "Male" : "Female";
        setGender(genderDetected);
        setProgress((p) => Math.min(p + 25, 100));

        if (progress >= 100) {
          // ✅ Show verification animation
          setStatus(
            <div className="flex flex-col items-center justify-center gap-3 animate-fadeIn">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center animate-scaleIn"
                style={{
                  background:
                    genderDetected === "Female"
                      ? "rgba(219,39,119,0.15)"
                      : "rgba(59,130,246,0.15)",
                  border: `2px solid ${
                    genderDetected === "Female" ? "#db2777" : "#3b82f6"
                  }`,
                  color:
                    genderDetected === "Female" ? "#db2777" : "#3b82f6",
                }}
              >
                <FontAwesomeIcon icon={faCheckCircle} size="2x" />
              </div>

              <div className="flex items-center gap-2 text-sm font-semibold">
                <FontAwesomeIcon
                  icon={genderDetected === "Female" ? faVenus : faMars}
                  style={{
                    color:
                      genderDetected === "Female" ? "#db2777" : "#3b82f6",
                  }}
                />
                <span>Verified as {genderDetected}</span>
              </div>
            </div>
          );

          // Stop camera and trigger callback
          videoRef.current.srcObject?.getTracks()?.forEach((t) => t.stop());
          setTimeout(() => onVerified(genderDetected), 2000);
        }
      }
    };
    interval = setInterval(analyze, 800);
    return () => clearInterval(interval);
  }, [progress]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background: "rgba(var(--bg),0.4)",
        color: "rgb(var(--text))",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Card Container */}
      <div
        className="rounded-2xl shadow-xl border p-8 w-full max-w-md flex flex-col items-center"
        style={{
          background: "rgba(var(--surface),0.85)",
          borderColor: "rgb(var(--border))",
        }}
      >
        {/* Video Frame */}
        <div
          className="relative w-72 h-52 sm:w-80 sm:h-60 rounded-xl overflow-hidden border"
          style={{
            borderColor: "rgb(var(--accent-500))",
            boxShadow: "0 0 20px rgba(var(--accent-500),0.25)",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute w-full h-full object-cover opacity-30"
          />
          {/* scanning border frame */}
          <div className="absolute inset-0 border-2 border-[rgb(var(--accent-500))] rounded-xl animate-pulse"></div>
        </div>

        {/* Status */}
        <div
          className="mt-5 text-sm sm:text-base font-medium text-center"
          style={{ color: "rgb(var(--accent-500))" }}
        >
          {status}
        </div>

        {/* Progress Bar */}
        <div
          className="w-full h-2 mt-5 rounded-full overflow-hidden"
          style={{
            background: "rgba(var(--bg),0.5)",
            border: "1px solid rgb(var(--border))",
          }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "rgb(var(--accent-500))",
            }}
          />
        </div>

        {/* Gender Info */}
        {gender && (
          <div
            className="mt-4 text-sm font-semibold flex items-center gap-2"
            style={{
              color:
                gender === "Female"
                  ? "#db2777"
                  : gender === "Male"
                  ? "#3b82f6"
                  : "rgb(var(--accent-500))",
            }}
          >
            <FontAwesomeIcon
              icon={gender === "Female" ? faVenus : faMars}
              size="sm"
            />
            Detected: {gender}
          </div>
        )}

        {/* Tagline */}
        <p
          className="mt-6 text-xs italic text-center"
          style={{ color: "rgb(var(--muted))" }}
        >
          “Confidence isn’t detected — it’s recognized.”
        </p>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-scaleIn {
          animation: scaleIn 0.6s ease-out forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
