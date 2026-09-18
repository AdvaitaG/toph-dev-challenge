"use client";

import { useEffect, useRef, useState } from "react";

type RecognitionEvent = {
  results: ArrayLike<{ isFinal: boolean; [index: number]: { transcript: string } }>;
};
type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useVoiceCapture() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const activeRef = useRef(false);
  const startedRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewRef = useRef("");
  const priorTextRef = useRef("");
  const sessionFinalRef = useRef("");
  const speechAllowedRef = useRef(true);

  function clearTimers() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null; intervalRef.current = null;
  }

  function stop() {
    activeRef.current = false;
    clearTimers();
    setRecording(false);
    setProcessing(true);
    setSeconds(Math.max(0.1, (Date.now() - startedRef.current) / 1000));
    try { recognitionRef.current?.stop(); } catch { /* Recognition may already have ended. */ }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  async function start() {
    if (activeRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setNotice("Microphone recording needs a supported browser and HTTPS or localhost.");
      return;
    }
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
      .find((type) => MediaRecorder.isTypeSupported(type));
    if (!mime) { setNotice("This browser cannot record a supported audio format."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = "";
      setPreviewUrl(""); setAudio(null); setTranscript(""); setNotice(""); setSeconds(0); setProcessing(false);
      priorTextRef.current = ""; sessionFinalRef.current = "";
      speechAllowedRef.current = true;
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => setNotice("Recording stopped unexpectedly. Please try again.");
      recorder.onstop = () => {
        setProcessing(false);
        const blob = new Blob(chunks, { type: mime.split(";")[0] });
        if (!blob.size || blob.size > 2_621_440) {
          setNotice("That recording is empty or over 2.5 MB. Please record a shorter clip.");
          return;
        }
        const url = URL.createObjectURL(blob);
        previewRef.current = url;
        setPreviewUrl(url);
        setAudio(blob);
      };
      recorder.start(1000);
      activeRef.current = true;
      startedRef.current = Date.now();
      setRecording(true);
      intervalRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - startedRef.current) / 1000)), 1000);
      timeoutRef.current = setTimeout(stop, 90_000);

      const browser = window as SpeechWindow;
      const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
      if (!Constructor) {
        setNotice("Automatic transcription is unavailable in this browser. Type the transcript before submitting.");
        return;
      }
      const recognition = new Constructor();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        const final: string[] = [];
        const interim: string[] = [];
        for (let index = 0; index < event.results.length; index++) {
          const result = event.results[index];
          (result.isFinal ? final : interim).push(result[0].transcript.trim());
        }
        sessionFinalRef.current = final.join(" ");
        setTranscript([priorTextRef.current, sessionFinalRef.current, interim.join(" ")].filter(Boolean).join(" ").trim());
      };
      recognition.onerror = () => {
        speechAllowedRef.current = false;
        setNotice("Automatic transcription stopped. You can edit or type the transcript below.");
      };
      recognition.onend = () => {
        priorTextRef.current = [priorTextRef.current, sessionFinalRef.current].filter(Boolean).join(" ").trim();
        sessionFinalRef.current = "";
        if (activeRef.current && speechAllowedRef.current) {
          try { recognition.start(); }
          catch { setNotice("Automatic transcription stopped. You can type the transcript below."); }
        }
      };
      try { recognition.start(); }
      catch { setNotice("Automatic transcription is unavailable. You can type the transcript below."); }
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setNotice("Microphone access was denied or unavailable. You can still submit a written note.");
    }
  }

  function clear() {
    if (activeRef.current) stop();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreviewUrl(""); setAudio(null); setTranscript(""); setSeconds(0); setNotice(""); setProcessing(false);
  }

  useEffect(() => () => {
    activeRef.current = false;
    clearTimers();
    recognitionRef.current?.stop();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  return { recording, processing, audio, previewUrl, transcript, setTranscript, seconds, notice, start, stop, clear };
}
