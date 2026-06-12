"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Check, AlertCircle } from "lucide-react";

export default function WebcamCapture({ onCapture, instruction = "Align your drawing inside the frame and take a photo" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    setError("");
    setLoading(true);
    setCapturedImage(null);

    try {
      // Prioritize environment camera (rear camera on mobile), fall back to user-facing
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setLoading(false);
    } catch (err) {
      console.error("Camera access error:", err);
      setError(
        "Could not access the camera. Please ensure camera permissions are enabled in your browser settings and try again."
      );
      setLoading(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function handleCapture() {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    
    // Set canvas dimensions to match the actual video stream size
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const context = canvas.getContext("2d");
    if (context) {
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to compressed base64 JPEG
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(dataUrl);
      
      // Stop camera once captured
      stopCamera();
    }
  }

  function handleRetake() {
    startCamera();
  }

  function handleConfirm() {
    if (capturedImage && onCapture) {
      onCapture(capturedImage);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        width: "100%",
        maxWidth: "500px",
        margin: "0 auto",
      }}
    >
      {/* Bounding Box Frame */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4/3",
          background: "#000",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "var(--shadow)",
          border: "2px solid var(--line)",
        }}
      >
        {capturedImage ? (
          /* Captured image preview */
          <img
            src={capturedImage}
            alt="Captured Drawing Preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          /* Live video stream */
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(1)", // No mirroring since environment camera is preferred
              }}
            />

            {/* Bounding Guides Overlay */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              {/* Semi-transparent outer dark overlay */}
              <div
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  background: "rgba(0, 0, 0, 0.45)",
                }}
              />
              
              {/* Highlighted capture frame cut-out */}
              <div
                style={{
                  position: "relative",
                  width: "75%",
                  height: "75%",
                  border: "2px dashed #91d6cd",
                  borderRadius: "12px",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
                  background: "transparent",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Corner indicator accents */}
                <div style={{ position: "absolute", top: "-2px", left: "-2px", width: "16px", height: "16px", borderTop: "4px solid var(--teal)", borderLeft: "4px solid var(--teal)" }} />
                <div style={{ position: "absolute", top: "-2px", right: "-2px", width: "16px", height: "16px", borderTop: "4px solid var(--teal)", borderRight: "4px solid var(--teal)" }} />
                <div style={{ position: "absolute", bottom: "-2px", left: "-2px", width: "16px", height: "16px", borderBottom: "4px solid var(--teal)", borderLeft: "4px solid var(--teal)" }} />
                <div style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "16px", height: "16px", borderBottom: "4px solid var(--teal)", borderRight: "4px solid var(--teal)" }} />
              </div>
            </div>
          </>
        )}

        {/* Floating status overlays */}
        {loading && !capturedImage && !error && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", zIndex: 10 }}>
            <p style={{ fontSize: "0.92rem", fontWeight: 600 }}>Starting camera...</p>
          </div>
        )}

        {error && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", justifyContent: "center", padding: "24px", color: "#fff", textAlign: "center", zIndex: 10 }}>
            <AlertCircle size={28} style={{ color: "#fda29b" }} />
            <p style={{ fontSize: "0.85rem", lineHeight: 1.4, maxWidth: "280px" }}>{error}</p>
            <button
              onClick={startCamera}
              style={{
                background: "var(--teal)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Retry Camera Access
            </button>
          </div>
        )}
      </div>

      {/* Helper instruction */}
      {!error && (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center", margin: 0, lineHeight: 1.4 }}>
          {capturedImage ? "Verify that your drawing is clearly visible before continuing." : instruction}
        </p>
      )}

      {/* Control Buttons */}
      {!loading && !error && (
        <div style={{ display: "flex", gap: "16px", width: "100%", justifyContent: "center" }}>
          {capturedImage ? (
            <>
              {/* Retake */}
              <button
                type="button"
                onClick={handleRetake}
                style={{
                  background: "transparent",
                  color: "var(--teal)",
                  border: "1px solid var(--teal)",
                  borderRadius: "8px",
                  padding: "12px 20px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={16} />
                Retake Photo
              </button>

              {/* Confirm */}
              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  background: "linear-gradient(135deg, #0f766e 0%, #0d5d58 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(15, 118, 110, 0.15)",
                }}
              >
                <Check size={16} />
                Confirm Photo
              </button>
            </>
          ) : (
            /* Capture Trigger */
            <button
              type="button"
              onClick={handleCapture}
              style={{
                background: "linear-gradient(135deg, #0f766e 0%, #0d5d58 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "50%",
                width: "56px",
                height: "56px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 6px 16px rgba(15, 118, 110, 0.25)",
                transition: "transform 0.15s ease",
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.92)"}
              onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <Camera size={24} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
