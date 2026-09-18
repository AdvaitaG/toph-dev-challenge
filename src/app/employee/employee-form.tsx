"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { submitActivity, type SubmissionState } from "./actions";
import { useVoiceCapture } from "./use-voice-capture";
import styles from "./employee.module.css";

const initial: SubmissionState = { error: "", success: "", submissionId: "" };
const activities = ["Spraying", "Harvesting", "Planting", "Irrigation", "Scouting"];

export function EmployeeForm({ name, farmName, today, fields, recent }: {
  name: string; farmName: string; today: string; fields: { id: string; name: string }[];
  recent: { id: string; activity_date: string; activity_type: string; summary: string }[];
}) {
  const [state, submit, pending] = useActionState(submitActivity, initial);
  const [voicePending, setVoicePending] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voiceSuccess, setVoiceSuccess] = useState("");
  const voice = useVoiceCapture();
  const router = useRouter();
  const [loggingOut, startLogout] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.submissionId) formRef.current?.reset(); }, [state.submissionId]);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!voice.audio) return; // The existing Server Action handles written-only notes.
    event.preventDefault();
    if (voice.recording || voice.processing || voicePending) return;
    setVoiceError(""); setVoiceSuccess("");
    const form = new FormData(event.currentTarget);
    const note = String(form.get("summary") ?? "").trim();
    if (!voice.transcript.trim() && !note) {
      setVoiceError("Add a transcript or written note before submitting.");
      return;
    }
    form.delete("summary");
    form.set("note", note);
    form.set("transcript", voice.transcript);
    form.set("durationSeconds", String(voice.seconds));
    form.set("audio", new File([voice.audio], "activity-recording", { type: voice.audio.type }));
    setVoicePending(true);
    try {
      const response = await fetch("/api/employee/voice", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) { setVoiceError(result.error || "Unable to save the recording."); return; }
      voice.clear();
      formRef.current?.reset();
      setVoiceSuccess("Recording and activity submitted. Your manager can play and review it.");
      router.refresh();
    } catch {
      setVoiceError("Unable to save the recording. Check your connection and try again.");
    } finally { setVoicePending(false); }
  }
  return <main className={styles.page}>
    <div className={styles.topbar}><strong>Toph</strong><button type="button" disabled={loggingOut} onClick={() => startLogout(async () => { await signOut(); })}>Log Out</button></div>
    <div className={styles.content}>
      <p className={styles.eyebrow}>{farmName} · Employee activity</p>
      <h1>Welcome, {name}</h1>
      <p className={styles.intro}>Record your voice or write a note about the work you completed today.</p>
      <form ref={formRef} action={submit} onSubmit={handleSubmit} className={styles.card} aria-busy={pending || voicePending}>
        <h2>Log Activity</h2>
        <div className={styles.grid}>
          <label>Field<select name="fieldId" required defaultValue=""><option value="" disabled>Select a field</option>{fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>
          <label>Activity<select name="activityType" required defaultValue=""><option value="" disabled>Select an activity</option>{activities.map((activity) => <option key={activity}>{activity}</option>)}</select></label>
          <label>Work date<input name="activityDate" type="date" required defaultValue={today} /></label>
          <div className={styles.times}><label>Start time<input name="startTime" type="time" required /></label><label>End time<input name="endTime" type="time" required /></label></div>
        </div>
        <section className={styles.voice} aria-label="Voice recording">
          <h3>Voice recording</h3>
          <p>Record up to 90 seconds. Speech is transcribed where your browser supports it; review the text before submitting.</p>
          <div className={styles.voiceActions}>
            {voice.recording
              ? <button type="button" onClick={voice.stop}>Stop recording · {voice.seconds}s</button>
              : <button type="button" onClick={voice.start} disabled={pending || voicePending}>Start recording</button>}
            {voice.audio && !voice.recording && <button type="button" onClick={voice.clear} disabled={voicePending}>Discard recording</button>}
          </div>
          {voice.recording && <p className={styles.recordingStatus} role="status">Microphone is recording…</p>}
          {voice.notice && <p className={styles.voiceNotice} role="status">{voice.notice}</p>}
          {voice.previewUrl && <audio controls preload="metadata" src={voice.previewUrl} aria-label="Preview your recording" />}
          {(voice.recording || voice.audio) && <label>Transcript (review and edit)
            <textarea value={voice.transcript} onChange={(event) => voice.setTranscript(event.target.value)} maxLength={5000} rows={4} placeholder="Your spoken words appear here when transcription is supported." />
          </label>}
        </section>
        <label className={styles.summary}>What happened? (written note, optional with a recording)<textarea name="summary" maxLength={2000} rows={5} placeholder="Describe the work completed or add details to your recording." /></label>
        {state.error && <p className={styles.error} role="alert">{state.error}</p>}
        {state.success && <p className={styles.success} role="status">{state.success}</p>}
        {voiceError && <p className={styles.error} role="alert">{voiceError}</p>}
        {voiceSuccess && <p className={styles.success} role="status">{voiceSuccess}</p>}
        <button className={styles.submit} type="submit" disabled={pending || voicePending || voice.recording || voice.processing || fields.length === 0}>{pending || voicePending ? "Submitting…" : "Submit Activity"}</button>
      </form>
      {recent.length > 0 && <section className={styles.recent} aria-labelledby="recent-heading"><h2 id="recent-heading">Recent submissions</h2><ul>{recent.map((item) => <li key={item.id}><strong>{item.activity_type} · {item.activity_date}</strong><p>{item.summary}</p></li>)}</ul></section>}
    </div>
  </main>;
}
