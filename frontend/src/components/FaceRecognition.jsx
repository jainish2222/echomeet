import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function FaceRecognition({ onVerified }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Loading models…");
  const [gender, setGender] = useState(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models"; // public/models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      ]);
      setStatus("Starting camera…");
      startVideo();
    };
    loadModels();
  }, []);

  // Start webcam
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setStatus("Scanning your face...");
    } catch (err) {
      console.error(err);
      setStatus("Camera access denied");
    }
  };

  // Analyze face
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
        setStatus(`✅ Detected: ${genderDetected}`);
        setTimeout(() => {
          videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
          onVerified(genderDetected);
        }, 1500);
      }
    };
    interval = setInterval(analyze, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 text-center">
      <h2 className="text-2xl font-semibold">{status}</h2>
      <video
        ref={videoRef}
        autoPlay
        muted
        className="rounded-xl border shadow-lg w-80 h-60 object-cover"
      />
      {gender && (
        <div className="text-lg font-medium text-green-500">
          {`You are detected as ${gender}`}
        </div>
      )}
    </div>
  );
}
