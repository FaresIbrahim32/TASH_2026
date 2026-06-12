"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Check, AlertCircle } from "lucide-react";

export default function AudioRecorder({ onConfirm, maxDurationSeconds = 60, instruction = "Click record and speak clearly" }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(maxDurationSeconds);
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  
  // Visualizer Refs
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  const onConfirmRef = useRef(onConfirm);
  const audioBlobRef = useRef(null);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  useEffect(() => {
    audioBlobRef.current = audioBlob;
  }, [audioBlob]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  function cleanupAudio() {
    stopTimer();
    
    // Check if we were actively recording on unmount
    const wasRecording = mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive";

    stopRecordingSession();
    stopPlayback();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }

    if (wasRecording && audioChunksRef.current.length > 0) {
      const mimeType = (mediaRecorderRef.current && mediaRecorderRef.current.mimeType) || "audio/webm";
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result;
        if (onConfirmRef.current) {
          onConfirmRef.current(base64data);
        }
      };
    } else if (audioBlobRef.current) {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlobRef.current);
      reader.onloadend = () => {
        const base64data = reader.result;
        if (onConfirmRef.current) {
          onConfirmRef.current(base64data);
        }
      };
    }
  }

  function stopRecordingSession() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function startTimer() {
    setTimeLeft(maxDurationSeconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startRecording() {
    setError("");
    setAudioUrl(null);
    setAudioBlob(null);
    audioChunksRef.current = [];
    setLoading(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Initialize Web Audio API for the visualizer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Start canvas visualization loop
      visualize();

      // Start recording
      const options = { mimeType: "audio/webm" };
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback for Safari which might not support webm
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(10); // Collect data every 10ms
      setIsRecording(true);
      startTimer();
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Microphone access denied. Please verify your browser permissions and try again.");
    } finally {
      setLoading(false);
    }
  }

  function stopRecording() {
    stopTimer();
    stopRecordingSession();
    setIsRecording(false);
    
    // Stop visualizer animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }

  // Draw moving waveform on HTML5 Canvas
  function visualize() {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const width = canvas.width;
    const height = canvas.height;

    function draw() {
      if (!canvas) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      // Clean background with a very subtle green tint
      ctx.fillStyle = "#f8faf9";
      ctx.fillRect(0, 0, width, height);

      // Draw horizontal baseline
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(15, 118, 110, 0.15)";
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw custom visualizer waves
      ctx.strokeStyle = "var(--teal)";
      ctx.lineWidth = 3;
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    draw();
  }

  function handlePlayPause() {
    if (!audioPlayerRef.current) return;
    const player = audioPlayerRef.current;

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }

  function stopPlayback() {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }

  function handleRetake() {
    stopPlayback();
    setAudioUrl(null);
    setAudioBlob(null);
    setTimeLeft(maxDurationSeconds);
    startRecording();
  }

  function handleConfirm() {
    if (!audioBlob) return;

    // Convert blob to base64 Data URL and trigger confirm callback
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64data = reader.result;
      if (onConfirm) {
        onConfirm(base64data);
      }
    };
  }

  // Formatting seconds left to mm:ss
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "18px",
        width: "100%",
        maxWidth: "460px",
        margin: "0 auto",
      }}
    >
      {/* Audio Visualizer Box */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100px",
          background: "#f8faf9",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
        }}
      >
        {isRecording ? (
          /* Active canvas visualizer */
          <canvas ref={canvasRef} width={460} height={100} style={{ width: "100%", height: "100%" }} />
        ) : audioUrl ? (
          /* Waveform display for playback review */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--teal)", fontWeight: 600 }}>
              Recording Saved Successfully
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Press Play to review your response.
            </span>
          </div>
        ) : (
          /* Default state waiting to record */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <Mic size={24} style={{ color: "var(--muted)" }} />
            <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
              Microphone Ready
            </span>
          </div>
        )}

        {/* Counter Overlay for active recording */}
        {isRecording && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(180, 35, 24, 0.1)",
              border: "1px solid rgba(180, 35, 24, 0.2)",
              color: "var(--red)",
              fontSize: "0.8rem",
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--red)",
                display: "inline-block",
                animation: "pulse 1.2s infinite",
              }}
            />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Helper text instructions */}
      {error ? (
        <div style={{ display: "flex", gap: "8px", color: "var(--red)", fontSize: "0.82rem", lineHeight: 1.4, textAlign: "center", padding: "0 10px" }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>{error}</span>
        </div>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
          {isRecording ? "Recording... speak now. Click Stop when finished." : instruction}
        </p>
      )}

      {/* Hidden Audio Player for Playback */}
      {audioUrl && (
        <audio
          ref={audioPlayerRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          style={{ display: "none" }}
        />
      )}

      {/* Control Buttons Panel */}
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", width: "100%" }}>
        {isRecording ? (
          /* STOP Recording */
          <button
            type="button"
            onClick={stopRecording}
            style={{
              background: "var(--red)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(180, 35, 24, 0.25)",
            }}
          >
            <Square size={16} fill="#ffffff" />
            Stop Recording
          </button>
        ) : audioUrl ? (
          /* PLAYBACK & CONFIRM Controls */
          <>
            {/* Play/Pause Review */}
            <button
              type="button"
              onClick={handlePlayPause}
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
                gap: "8px",
              }}
            >
              {isPlaying ? <Pause size={16} fill="var(--teal)" /> : <Play size={16} fill="var(--teal)" />}
              {isPlaying ? "Pause" : "Play Recording"}
            </button>

            {/* Retake */}
            <button
              type="button"
              onClick={handleRetake}
              style={{
                background: "transparent",
                color: "var(--muted)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "12px 16px",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RotateCcw size={16} />
              Retake
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
              Confirm Response
            </button>
          </>
        ) : (
          /* START Recording Trigger */
          <button
            type="button"
            disabled={loading}
            onClick={startRecording}
            style={{
              background: "linear-gradient(135deg, #0f766e 0%, #0d5d58 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "14px 28px",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(15, 118, 110, 0.15)",
              transition: "transform 0.15s ease",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.96)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <Mic size={18} fill="#ffffff" />
            Start Recording
          </button>
        )}
      </div>

      {/* Embedded pulse animation CSS */}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(180, 35, 24, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(180, 35, 24, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(180, 35, 24, 0);
          }
        }
      `}</style>
    </div>
  );
}
