"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderMode = "audio" | "video" | "none";
export type RecorderState = "idle" | "requesting" | "ready" | "recording" | "paused" | "stopped" | "error";

export interface RecorderResult {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}

function pickMime(mode: RecorderMode): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates =
    mode === "video"
      ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
}

/**
 * Thin wrapper over MediaRecorder. Also works in `none` mode as a pure timer,
 * so every practice flow behaves the same with or without recording.
 */
export function useRecorder(mode: RecorderMode) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const resultRef = useRef<RecorderResult | null>(null);
  const resolveRef = useRef<((r: RecorderResult | null) => void) | null>(null);

  const stopTicker = () => {
    if (tickRef.current) cancelAnimationFrame(tickRef.current);
    tickRef.current = null;
  };
  const startTicker = () => {
    const loop = () => {
      setElapsed(accumulatedRef.current + (performance.now() - startRef.current) / 1000);
      tickRef.current = requestAnimationFrame(loop);
    };
    tickRef.current = requestAnimationFrame(loop);
  };

  const releaseStream = useCallback(() => {
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
  }, []);

  const prepare = useCallback(async () => {
    setError(null);
    if (mode === "none") {
      setState("ready");
      return true;
    }
    setState("requesting");
    try {
      const s = await navigator.mediaDevices.getUserMedia(
        mode === "video" ? { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } } : { audio: true },
      );
      setStream(s);
      setState("ready");
      return true;
    } catch (e) {
      setError((e as Error).message || "Could not access microphone/camera");
      setState("error");
      return false;
    }
  }, [mode]);

  const start = useCallback(async () => {
    accumulatedRef.current = 0;
    setElapsed(0);
    resultRef.current = null;
    if (mode === "none") {
      startRef.current = performance.now();
      setState("recording");
      startTicker();
      return;
    }
    let s = stream;
    if (!s) {
      const ok = await prepare();
      if (!ok) return;
      // stream state updates async; grab it directly
      s = await navigator.mediaDevices.getUserMedia(mode === "video" ? { audio: true, video: true } : { audio: true });
      setStream(s);
    }
    const mimeType = pickMime(mode);
    const rec = new MediaRecorder(s, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mimeType || "audio/webm" });
      const result = { blob, mimeType: blob.type, durationSeconds: accumulatedRef.current };
      resultRef.current = result;
      resolveRef.current?.(result);
      resolveRef.current = null;
    };
    recorderRef.current = rec;
    rec.start(1000);
    startRef.current = performance.now();
    setState("recording");
    startTicker();
  }, [mode, prepare, stream]);

  const pause = useCallback(() => {
    if (state !== "recording") return;
    accumulatedRef.current += (performance.now() - startRef.current) / 1000;
    stopTicker();
    setElapsed(accumulatedRef.current);
    recorderRef.current?.pause();
    setState("paused");
  }, [state]);

  const resume = useCallback(() => {
    if (state !== "paused") return;
    startRef.current = performance.now();
    recorderRef.current?.resume();
    setState("recording");
    startTicker();
  }, [state]);

  /** Resolves with the recording (or null in `none` mode). */
  const stop = useCallback((): Promise<RecorderResult | null> => {
    if (state === "recording") accumulatedRef.current += (performance.now() - startRef.current) / 1000;
    stopTicker();
    setElapsed(accumulatedRef.current);
    setState("stopped");
    const rec = recorderRef.current;
    if (mode === "none" || !rec) {
      releaseStream();
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      resolveRef.current = (r) => {
        releaseStream();
        resolve(r);
      };
      if (rec.state !== "inactive") rec.stop();
      else resolveRef.current(resultRef.current);
    });
  }, [mode, releaseStream, state]);

  const reset = useCallback(() => {
    stopTicker();
    recorderRef.current = null;
    chunksRef.current = [];
    accumulatedRef.current = 0;
    setElapsed(0);
    setState("idle");
    releaseStream();
  }, [releaseStream]);

  useEffect(() => {
    return () => {
      stopTicker();
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, error, elapsed, stream, prepare, start, pause, resume, stop, reset, durationSeconds: accumulatedRef };
}

export const recorderSupported = () =>
  typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
