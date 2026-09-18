"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { addLogTag, approveActivity, denyActivity, removeLogTag, removeEmployeeActivity } from "@/app/logs/actions";
import { Pause, X } from "lucide-react";
import { Expand, Play, Star } from "@/components/ui/design-icons";
import { Modal } from "@/components/ui/modal";
import type { DashboardData, DashboardLog } from "@/types/dashboard";

interface LogDetailsProps {
  log: DashboardLog;
  source: DashboardData["source"];
  onDecided?: (decision: "approved" | "denied") => void;
}

export function LogDetails({ log, source, onDecided }: LogDetailsProps) {
  const [mapOpen, setMapOpen] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);
  const [denialReason, setDenialReason] = useState("");
  const [denialError, setDenialError] = useState("");
  const [tagOpen, setTagOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagError, setTagError] = useState("");
  const [audioNotice, setAudioNotice] = useState("");
  const [playing, setPlaying] = useState(false);
  const [saving, startSaving] = useTransition();
  const mutationInFlight = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const tags = log.tags;
  const textOnlySubmission = log.canRemove && !log.audioUrl;

  async function toggleAudio() {
    if (!log.audioUrl) { setAudioNotice("No recording is available for this demo log."); return; }
    if (playing) audioRef.current?.pause();
    else {
      try { await audioRef.current?.play(); setAudioNotice(""); }
      catch { setAudioNotice("The recording could not be played. Please try again."); }
    }
  }

  function addTag(event: FormEvent) {
    event.preventDefault();
    const name = tagName.trim().replace(/\s+/g, " ");
    if (!name) { setTagError("Enter a tag name."); return; }
    if (tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())) { setTagError("This tag already exists."); return; }
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    startSaving(async () => {
      try {
        const result = await addLogTag(log.id, name);
        if (result.error) { setTagError(result.error); return; }
        setTagName(""); setTagError(""); setTagOpen(false);
      } catch { setTagError("Unable to save this tag. Please try again."); }
      finally { mutationInFlight.current = false; }
    });
  }

  function removeTag(id: string) {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    startSaving(async () => {
      try {
        const result = await removeLogTag(log.id, id);
        setTagError(result.error);
      } catch { setTagError("Unable to remove this tag. Please try again."); }
      finally { mutationInFlight.current = false; }
    });
  }

  function removeActivity() {
    if (mutationInFlight.current || !window.confirm("Remove this employee activity? This cannot be undone.")) return;
    mutationInFlight.current = true;
    startSaving(async () => {
      try {
        const result = await removeEmployeeActivity(log.id);
        if (result.error) setTagError(result.error);
      } catch { setTagError("Unable to remove this activity. Please try again."); }
      finally { mutationInFlight.current = false; }
    });
  }

  function approve() {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    startSaving(async () => {
      try {
        const result = await approveActivity(log.id);
        if (result.error) { setTagError(result.error); return; }
        setTagError("");
        onDecided?.("approved");
      } catch { setTagError("Unable to approve this activity. Please try again."); }
      finally { mutationInFlight.current = false; }
    });
  }

  function deny(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    startSaving(async () => {
      try {
        const result = await denyActivity(log.id, denialReason);
        if (result.error) { setDenialError(result.error); return; }
        setDenialError("");
        setDenyOpen(false);
        onDecided?.("denied");
      } catch { setDenialError("Unable to deny this activity. Please try again."); }
      finally { mutationInFlight.current = false; }
    });
  }

  return <div className="log-details" id={`log-${log.id}`} role="region" aria-label={`${log.employee.name}'s log details`}>
    <div className="recording-details">
      {textOnlySubmission ? <p className="control-hint">No recording attached to this activity.</p> : <div className="waveform" role="img" aria-label="Illustrative recording waveform, not synchronized to audio" />}
      {log.audioUrl && <audio ref={audioRef} src={log.audioUrl} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setAudioNotice("The recording is unavailable. Please try again later."); }} />}
      {!textOnlySubmission && <button className="detail-button play-button" onClick={toggleAudio}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? "Pause Recording" : "Play Recording"}</button>}
      {audioNotice && <p className="control-hint" role="status">{audioNotice}</p>}
      {source === "supabase" && <button className="detail-button add-tag-button" aria-expanded={tagOpen} onClick={() => setTagOpen(!tagOpen)}><Star size={16} />Add Tag</button>}
      {tagOpen && source === "supabase" && <form className="tag-form" onSubmit={addTag} aria-busy={saving}>
        <label htmlFor={`tag-${log.id}`}>Tag name</label>
        <div className="tag-input-row"><input id={`tag-${log.id}`} autoFocus maxLength={40} disabled={saving} value={tagName} onChange={(event) => { setTagName(event.target.value); setTagError(""); }} placeholder="e.g. Needs Review" /><button className="pill pill-active" type="submit" disabled={saving}>{saving ? "Saving…" : "Add"}</button><button className="icon-button" type="button" disabled={saving} aria-label="Cancel adding tag" onClick={() => setTagOpen(false)}><X size={16} /></button></div>
        <p className="control-hint">Tags are saved for your farm.</p>
      </form>}
      {tagError && <p className="form-error" role="alert">{tagError}</p>}
      {tags.length > 0 && <ul className="tag-list" aria-label="Log tags">{tags.map((tag) => <li key={tag.id}><Star size={12} />{tag.name}{source === "supabase" && <button className="icon-button" disabled={saving} onClick={() => removeTag(tag.id)} aria-label={`Remove ${tag.name} tag`}><X size={12} /></button>}</li>)}</ul>}
      {source === "supabase" && log.reviewStatus === "pending" && <div className="review-actions"><button className="detail-button" type="button" disabled={saving} onClick={approve}>Approve</button><button className="detail-button deny-button" type="button" disabled={saving} onClick={() => setDenyOpen(true)}>Deny</button></div>}
      {source === "supabase" && log.canRemove && <button className="detail-button" type="button" disabled={saving} onClick={removeActivity}>Remove activity</button>}
      <section className="log-summary"><h3>Summary</h3><p>{'"'}{log.summary}</p></section>
      {log.reviewStatus === "denied" && log.denialReason && <section className="denial-reason"><h3>Denial reason</h3><p>{log.denialReason}</p></section>}
    </div>
    <div className="location-details">
      {textOnlySubmission && !log.location ? <p className="control-hint">No field location recorded for this activity.</p> : <><div className="map-preview" role="img" aria-label="Design preview of satellite farmland. This image does not represent this log's location." /><button className="detail-button expand-map-button" onClick={() => setMapOpen(true)}><Expand size={16} />Expand Map</button></>}
    </div>
    <Modal open={mapOpen} title={`${log.field} · Map preview`} onClose={() => setMapOpen(false)} wide>
      <div className="map-preview map-expanded" role="img" aria-label="Satellite farmland image from the supplied design" />
      <p className="control-hint">Design preview only. {log.location ? `Recorded coordinates: ${log.location.latitude}, ${log.location.longitude}.` : "No location has been recorded for this demo log."}</p>
    </Modal>
    <Modal open={denyOpen} title="Deny Activity" onClose={() => { if (!saving) setDenyOpen(false); }}>
      <form className="denial-form" onSubmit={deny}>
        <label htmlFor={`denial-reason-${log.id}`}>Reason (optional)</label>
        <input id={`denial-reason-${log.id}`} value={denialReason} onChange={(event) => { setDenialReason(event.target.value); setDenialError(""); }} maxLength={200} placeholder="e.g. Incorrect field selected" disabled={saving} />
        {denialError && <p className="form-error" role="alert">{denialError}</p>}
        <div className="denial-form-actions"><button type="button" className="pill" disabled={saving} onClick={() => setDenyOpen(false)}>Cancel</button><button type="submit" className="pill pill-active" disabled={saving}>{saving ? "Denying…" : "Deny Activity"}</button></div>
      </form>
    </Modal>
  </div>;
}
