"use client";

import { useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, ImagePlus, Lightbulb, LoaderCircle, LocateFixed, MapPin, Send, ShieldCheck, Upload, X } from "lucide-react";
import { CATEGORIES, PRIORITIES, type CivicReport, type Preferences } from "@/lib/types";
import { CategoryIcon, Modal } from "@/components/ui";
import MapLoading from "@/components/map-loading";

const CivicMap = dynamic(() => import("@/components/civic-map"), { ssr: false, loading: MapLoading });

async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Please choose a JPG, PNG, or WebP image.");
  if (file.size > 10_000_000) throw new Error("Please choose a photo smaller than 10 MB.");
  const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("The photo couldn’t be read. Please try another.")); reader.readAsDataURL(file); });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("This photo couldn’t be opened. Please try another.")); img.src = source; });
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser couldn’t process this photo.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let result = canvas.toDataURL("image/jpeg", 0.78);
  if (result.length > 2_900_000) result = canvas.toDataURL("image/jpeg", 0.5);
  if (result.length > 2_900_000) throw new Error("This photo is still too large. Please choose a smaller image.");
  return result;
}

export default function ReportForm({ preferences, onClose, onCreated }: { preferences: Preferences; onClose: () => void; onCreated: (report: CivicReport) => void }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [photo, setPhoto] = useState("");
  const [address, setAddress] = useState("");
  const [locality, setLocality] = useState(preferences.neighborhood);
  const [location, setLocation] = useState({ latitude: 12.9345, longitude: 77.6266 });
  const [confirmed, setConfirmed] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(file?: File) {
    if (!file) return;
    setError(""); setUploadBusy(true);
    try { setPhoto(await preparePhoto(file)); } catch (err) { setError(err instanceof Error ? err.message : "Unable to upload the photo."); }
    finally { setUploadBusy(false); }
  }

  function captureGPS() {
    setError("");
    if (!navigator.geolocation) { setError("Your browser doesn’t support GPS. Please pin the location on the map instead."); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition((position) => { setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setConfirmed(true); setGpsBusy(false); }, (err) => { setGpsBusy(false); setError(err.code === 1 ? "Location permission was denied. You can click the map or enter coordinates to set the location." : "We couldn’t get your GPS location. Please pin it on the map or enter coordinates."); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (step === 1) { if (title.trim().length < 8 || description.trim().length < 15) { setError("Please add a title of at least 8 characters and a description of at least 15 characters."); return; } setStep(2); return; }
    if (!photo) { setError("Please add a photo of the issue before submitting."); return; }
    if (!confirmed) { setError("Use GPS, click the map, or enter coordinates to confirm the location."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, category, priority, address, locality, latitude: location.latitude, longitude: location.longitude, imageUrl: photo }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit your report.");
      onCreated(data.report);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to submit your report."); }
    finally { setSubmitting(false); }
  }

  return <Modal onClose={onClose} label="Report a civic issue" className="report-modal">
    <div className="modal-heading"><span className="eyebrow">SMALL ACTIONS. REAL CHANGE.</span><h2>Report a civic issue</h2><p>A few details can make a big difference.</p></div>
    <div className="form-steps"><div className={step === 1 ? "active" : "complete"}><span>{step === 2 ? <Check size={14} /> : "1"}</span>Issue details</div><i /><div className={step === 2 ? "active" : ""}><span>2</span>Location & photo</div></div>
    <form onSubmit={submit}>
      <div className="report-form-body">
        {step === 1 ? <>
          <fieldset className="category-fieldset"><legend>What kind of issue is it?</legend><div className="category-options">{CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)} aria-pressed={category === item}><CategoryIcon category={item} size={21} /><span>{item}</span>{category === item && <CheckCircle2 size={15} className="category-check" />}</button>)}</div></fieldset>
          <label className="field-label">Give your report a title <span>*</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Large pothole near the bus stop" required minLength={8} maxLength={120} /></label>
          <label className="field-label">Tell us a little more <span>*</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What’s the issue? How long has it been here? Any details that could help the team?" rows={4} required minLength={15} maxLength={2500} /><small className="character-count">{description.length}/2,500</small></label>
          <fieldset className="priority-fieldset"><legend>How urgent is it?</legend><div className="priority-options">{PRIORITIES.map((item) => <button key={item} type="button" role="radio" aria-checked={priority === item} className={priority === item ? "selected" : ""} onClick={() => setPriority(item)}><i className={`priority-dot ${item}`} />{item.charAt(0).toUpperCase() + item.slice(1)}{priority === item && <Check size={14} />}</button>)}</div></fieldset>
          <div className="form-tip"><Lightbulb size={17} /><p>A clear title and a specific location help the right team get it sorted faster.</p></div>
        </> : <>
          <div className="photo-field-heading"><div><h3>Add a photo</h3><p>Show the team what needs attention.</p></div><span className="required-tag">Required</span></div>
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden ref={fileInput} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
          <div className={`photo-dropzone ${dragging ? "dragging" : ""} ${photo ? "has-photo" : ""}`} role="button" tabIndex={0} onClick={() => { if (!uploadBusy) fileInput.current?.click(); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.current?.click(); } }} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]); }}>
            {uploadBusy ? <><LoaderCircle size={28} className="spin" /><strong>Preparing your photo…</strong></> : photo ? <><img src={photo} alt="Your civic issue photo preview" /><span className="replace-photo"><Camera size={15} />Click to replace photo</span><button type="button" className="remove-photo" aria-label="Remove photo" onClick={(event) => { event.stopPropagation(); setPhoto(""); }}><X size={16} /></button></> : <><span className="upload-icon"><ImagePlus size={26} /></span><strong><span>Click to upload</span> or drag and drop</strong><p>JPG, PNG, or WebP · up to 10 MB</p></>}
          </div>
          <div className="location-heading"><h3><MapPin size={17} />Where is the issue?</h3><button type="button" className="button button-gps" onClick={captureGPS} disabled={gpsBusy}>{gpsBusy ? <LoaderCircle size={15} className="spin" /> : <LocateFixed size={15} />}{gpsBusy ? "Locating…" : "Use my GPS location"}</button></div>
          <div className="location-picker"><CivicMap reports={[]} location={location} onLocationPick={(latitude, longitude) => { setLocation({ latitude, longitude }); setConfirmed(true); setError(""); }} /></div>
          <div className={`location-confirmation ${confirmed ? "confirmed" : ""}`}>{confirmed ? <><CheckCircle2 size={13} />Location confirmed · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</> : <><MapPin size={13} />Click the map to drop a pin, use GPS, or enter coordinates below.</>}</div>
          <div className="coordinate-fields"><label>Latitude<input type="number" step="any" min={-90} max={90} value={location.latitude} onChange={(event) => { setLocation({ ...location, latitude: Number(event.target.value) }); setConfirmed(true); }} /></label><label>Longitude<input type="number" step="any" min={-180} max={180} value={location.longitude} onChange={(event) => { setLocation({ ...location, longitude: Number(event.target.value) }); setConfirmed(true); }} /></label></div>
          <div className="form-two-columns"><label className="field-label">Street address or landmark <span>*</span><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="e.g. 100 Feet Road, near the bus stop" required minLength={5} maxLength={240} /></label><label className="field-label">Neighborhood <span>*</span><input value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="e.g. Koramangala" required minLength={2} maxLength={80} list="neighborhood-options" /><datalist id="neighborhood-options">{["Koramangala", "Indiranagar", "HSR Layout", "Jayanagar", "Domlur", "Ejipura"].map((item) => <option key={item} value={item} />)}</datalist></label></div>
          <div className="privacy-note"><ShieldCheck size={15} /><span>Your report is public. Avoid including faces or personal information in photos.</span></div>
        </>}
        {error && <div className="form-error" role="alert">{error}</div>}
      </div>
      <div className="modal-footer"><button type="button" className="button button-secondary" onClick={() => { if (step === 2) { setStep(1); setError(""); } else onClose(); }} disabled={submitting}>{step === 2 && <ArrowLeft size={15} />}{step === 2 ? "Back" : "Cancel"}</button><span className="step-count">Step {step} of 2</span><button type="submit" className="button button-primary" disabled={submitting || uploadBusy}>{submitting ? <LoaderCircle size={16} className="spin" /> : step === 1 ? null : <Send size={15} />}{submitting ? "Submitting…" : step === 1 ? "Continue" : "Submit report"}{step === 1 && <ArrowRight size={16} />}</button></div>
    </form>
  </Modal>;
}
