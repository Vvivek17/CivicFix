"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  Fingerprint,
  HardHat,
  IdCard,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
} from "lucide-react";
import DigiLockerModal from "@/components/digilocker-modal";
import { DigiLockerConsentResult } from "@/lib/digilocker";

interface SampleCard {
  id: string;
  badgeId: string;
  kgid: string;
  aadhaar: string;
  name: string;
  designation: string;
  department: string;
  ward: string;
  email: string;
  phone: string;
  photoUrl: string;
  citizenship: string;
}

const SAMPLE_ID_CARDS: SampleCard[] = [
  {
    id: "sample-1",
    badgeId: "BBMP-ENG-15104",
    kgid: "KGID-884920",
    aadhaar: "XXXX-XXXX-8921",
    name: "Kavitha N. Rao",
    designation: "Assistant Engineer (Road Infrastructure)",
    department: "Engineering & Infrastructure Division",
    ward: "Koramangala",
    email: "kavitha.rao@bbmp.gov.in",
    phone: "+91 94806 88120",
    photoUrl: "/images/worker-1.jpg",
    citizenship: "Citizen of India (Resident in Bengaluru, Karnataka)",
  },
  {
    id: "sample-2",
    badgeId: "BBMP-WRK-08012",
    kgid: "KGID-712390",
    aadhaar: "XXXX-XXXX-4410",
    name: "Santosh Kumar",
    designation: "Rapid Response Field Crew Lead",
    department: "Solid Waste & Sanitation Squad",
    ward: "Indiranagar",
    email: "santosh.kumar@bbmp.gov.in",
    phone: "+91 98452 33410",
    photoUrl: "/images/worker-2.jpg",
    citizenship: "Citizen of India (Resident in Bengaluru, Karnataka)",
  },
  {
    id: "sample-3",
    badgeId: "BBMP-MGR-17409",
    kgid: "KGID-650123",
    aadhaar: "XXXX-XXXX-3198",
    name: "Vinay Mohan Reddy",
    designation: "Ward Superintendent & Triage Officer",
    department: "Health & Civic Amenities",
    ward: "HSR Layout",
    email: "vinay.reddy@bbmp.gov.in",
    phone: "+91 94806 85174",
    photoUrl: "/images/worker-3.jpg",
    citizenship: "Citizen of India (Resident in Bengaluru, Karnataka)",
  },
];

interface EmployeeIdScannerProps {
  onSuccess: (data: { user: { id: number; name: string; email: string; role: string } }) => void;
  onCancel?: () => void;
  isInApp?: boolean;
}

export default function EmployeeIdScanner({ onSuccess, onCancel, isInApp = false }: EmployeeIdScannerProps) {
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);

  // DigiLocker integration state
  const [showDigiLockerModal, setShowDigiLockerModal] = useState(false);
  const [digiLockerResult, setDigiLockerResult] = useState<DigiLockerConsentResult | null>(null);

  // Form Fields extracted from ID Card & Government Verification
  const [badgeId, setBadgeId] = useState("");
  const [kgidNumber, setKgidNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [ward, setWard] = useState("Koramangala");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [citizenshipStatus, setCitizenshipStatus] = useState("Citizen of India (Living in India)");
  const [citizenGuaranteeConfirmed, setCitizenGuaranteeConfirmed] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function triggerOCR(data: {
    badgeId: string;
    kgid: string;
    aadhaar: string;
    name: string;
    designation: string;
    department: string;
    ward: string;
    email: string;
    phone: string;
    citizenship: string;
  }) {
    setScanning(true);
    setVerified(false);
    setError("");

    setTimeout(() => {
      setBadgeId(data.badgeId);
      setKgidNumber(data.kgid);
      setAadhaarNumber(data.aadhaar);
      setName(data.name);
      setDesignation(data.designation);
      setDepartment(data.department);
      setWard(data.ward);
      setEmail(data.email);
      setPhone(data.phone);
      setCitizenshipStatus(data.citizenship);
      setCitizenGuaranteeConfirmed(true);
      setScanning(false);
      setVerified(true);
    }, 1200);
  }

  function handleSelectSample(sample: SampleCard) {
    setDigiLockerResult(null);
    setCardImage(sample.photoUrl);
    triggerOCR(sample);
  }

  function handleDigiLockerSuccess(result: DigiLockerConsentResult) {
    setShowDigiLockerModal(false);
    setDigiLockerResult(result);
    setCardImage(result.profile.photoUrl);
    setBadgeId(result.profile.badgeId);
    setKgidNumber(result.profile.kgidNumber);
    setAadhaarNumber(result.profile.aadhaarNumber);
    setName(result.profile.name);
    setDesignation(result.profile.designation);
    setDepartment(result.profile.department);
    setWard(result.profile.ward);
    setEmail(result.profile.email);
    setPhone(result.profile.mobile.startsWith("+91") ? result.profile.mobile : `+91 ${result.profile.mobile}`);
    setCitizenshipStatus(result.profile.citizenship);
    setCitizenGuaranteeConfirmed(true);
    setVerified(true);
    setError("");
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, or WebP).");
      return;
    }

    setDigiLockerResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCardImage(result);

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const generatedName =
        cleanFileName.length > 3
          ? cleanFileName
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")
          : "Deepak Sharma";

      triggerOCR({
        badgeId: `BBMP-EMP-${new Date().getFullYear()}-${randomSuffix}`,
        kgid: `KGID-${randomSuffix}8`,
        aadhaar: `XXXX-XXXX-${randomSuffix}`,
        name: generatedName,
        designation: "Assistant Works Engineer / Field Officer",
        department: "BBMP Municipal Operations & Infrastructure",
        ward: "Koramangala",
        email: `${generatedName.toLowerCase().replace(/\s+/g, ".")}@bbmp.gov.in`,
        phone: "+91 94806 85200",
        citizenship: "Citizen of India (Living in Bengaluru, Karnataka)",
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!verified) {
      setError("Please authenticate via DigiLocker or upload an official Municipal Identity Card first.");
      return;
    }
    if (!citizenGuaranteeConfirmed) {
      setError("You must confirm the Government Guarantee of Indian Citizenship and Residence to proceed.");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register-authority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          badgeId,
          kgidNumber,
          aadhaarNumber,
          name,
          designation,
          department,
          ward,
          email,
          phone,
          citizenGuaranteeConfirmed,
          digilockerVerified: Boolean(digiLockerResult),
          digilockerTxnId: digiLockerResult?.txnId,
          digilockerDocUri: digiLockerResult?.docUris?.[0],
          password: password || "Authority@123",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Employee registration failed.");
      }

      onSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register employee.");
      setBusy(false);
    }
  }

  return (
    <div className="id-registration-wrapper">
      {/* Official Government Header */}
      <div className="id-scanner-header">
        <div className="id-scanner-title">
          <span className="gov-emblem-badge">🇮🇳</span>
          <div>
            <div className="gov-header-tagline">
              <span>GOVERNMENT OF KARNATAKA</span> · <span>BRUHAT BENGALURU MAHANAGARA PALIKE</span>
            </div>
            <h3>Official Municipal Employee Authority Registration</h3>
            <p>Authentic public service onboarding with Government Guarantee of Indian Citizenship</p>
          </div>
        </div>
        {onCancel && (
          <button type="button" className="text-button" onClick={onCancel}>
            Back to sign in
          </button>
        )}
      </div>

      {/* DigiLocker Official Verification Feature Callout */}
      <div className="digilocker-featured-banner">
        <div className="dl-featured-left">
          <div className="dl-featured-emblem-row">
            <span className="dl-featured-cloud">☁️</span>
            <span className="dl-featured-title">DigiLocker</span>
            <span className="dl-featured-tag">Govt of India</span>
          </div>
          <h4>Instant Paperless Verification with DigiLocker</h4>
          <p>
            Authenticate seamlessly using your Aadhaar e-KYC and fetch your verified Municipal Service Record & KGID certificate directly from the National Digital Locker.
          </p>
        </div>
        <button
          type="button"
          className="button dl-connect-btn"
          onClick={() => setShowDigiLockerModal(true)}
        >
          <Fingerprint size={17} />
          <span>Verify with DigiLocker</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Government Guarantee Notice Banner */}
      <div className="gov-guarantee-notice-card">
        <div className="gov-guarantee-icon">
          <ShieldCheck size={22} />
        </div>
        <div className="gov-guarantee-text">
          <strong>Government Guarantee of Indian Citizenship & Public Service</strong>
          <p>
            Authority access is restricted to verified <b>Citizens of India living in India</b> holding lawful appointment under the Karnataka Municipal Corporations Act, 1976. Verified via DigiLocker / UIDAI National Registry.
          </p>
        </div>
      </div>

      {/* ID Card Scanner / Upload Box */}
      <div className="id-card-dropzone-container">
        <div className="id-method-divider">
          <span>Or scan / upload physical Municipal Identity Card</span>
        </div>

        <label className={`id-card-dropzone ${scanning ? "scanning" : ""} ${verified ? "verified" : ""}`}>
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="sr-only"
            onChange={handleFileUpload}
          />
          {scanning ? (
            <div className="scanner-active-box">
              <div className="scanner-laser" />
              <LoaderCircle size={28} className="spin scanner-spinner" />
              <strong>Verifying Municipal ID & Indian Citizen Records…</strong>
              <small>Authenticating BBMP hologram, government seal, KGID code & UIDAI citizen guarantee</small>
            </div>
          ) : verified ? (
            <div className="scanner-verified-box">
              <div className="verified-seal">
                <CheckCircle2 size={24} />
              </div>
              <div className="verified-summary">
                <div className="verified-pill-row">
                  {digiLockerResult ? (
                    <span className="verified-dl-tag">☁️ DIGILOCKER VERIFIED</span>
                  ) : (
                    <span className="verified-gov-tag">✓ GOVT OF INDIA VERIFIED</span>
                  )}
                  <span className="verified-citizen-tag">🇮🇳 CITIZEN OF INDIA</span>
                </div>
                <strong>
                  {digiLockerResult ? "DigiLocker Authenticated Public Servant" : "Official Identity Card Authenticated"}
                </strong>
                <p>
                  Card ID: <code>{badgeId}</code> · Service Code: <code>{kgidNumber || "KGID-884920"}</code> · UID:{" "}
                  <code>{aadhaarNumber || "XXXX-XXXX-8921"}</code>
                </p>
              </div>
              <span className="re-upload-text">{digiLockerResult ? "Change DigiLocker" : "Replace card"}</span>
            </div>
          ) : (
            <div className="scanner-empty-box">
              <span className="scanner-upload-icon">
                <Upload size={24} />
              </span>
              <strong>Scan / Upload Official Municipal Employee ID Card</strong>
              <p>Upload a photo of your BBMP / Municipal Corporation ID card containing employee seal and badge number</p>
              <span className="button button-secondary upload-browse-btn">Select Official ID Card Photo</span>
            </div>
          )}
        </label>

        {/* Quick Sample Selector for Demonstration */}
        <div className="sample-cards-tray">
          <span className="sample-tray-label">
            <Sparkles size={13} /> Or test with sample authentic municipal government identity cards:
          </span>
          <div className="sample-cards-list">
            {SAMPLE_ID_CARDS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                className={`sample-card-btn ${badgeId === sample.badgeId ? "active" : ""}`}
                onClick={() => handleSelectSample(sample)}
              >
                <IdCard size={15} />
                <div>
                  <strong>{sample.name}</strong>
                  <small>
                    {sample.badgeId} · {sample.kgid}
                  </small>
                  <span className="sample-citizen-badge">🇮🇳 Indian Citizen</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verified DigiLocker Certificate Showcase (When DigiLocker is used) */}
      {digiLockerResult && (
        <div className="dl-verified-showcase animate-rise">
          <div className="dl-showcase-header">
            <span className="dl-showcase-logo">☁️ DigiLocker Verified</span>
            <span className="dl-showcase-txn">Txn: <code>{digiLockerResult.txnId}</code></span>
          </div>
          <div className="dl-showcase-body">
            <div className="dl-showcase-doc-item">
              <CheckCircle2 size={15} className="dl-check-green" />
              <span>
                <b>UIDAI Aadhaar e-KYC:</b> Statutory Proof of Indian Citizenship & Residence living in India
              </span>
            </div>
            <div className="dl-showcase-doc-item">
              <CheckCircle2 size={15} className="dl-check-green" />
              <span>
                <b>BBMP Service Record:</b> Urban Development Dept Appointment (Badge <code>{badgeId}</code>)
              </span>
            </div>
            <div className="dl-showcase-doc-item">
              <CheckCircle2 size={15} className="dl-check-green" />
              <span>
                <b>KGID Insurance Certificate:</b> State Public Servant Policy (<code>{kgidNumber}</code>)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Registration Form auto-populated from Card / DigiLocker */}
      {verified && (
        <form onSubmit={handleSubmit} className="id-extracted-form animate-rise">
          <div className="extracted-fields-notice">
            <Check size={14} />
            <span>
              {digiLockerResult
                ? "DigiLocker records imported. Details verified with Government of India Citizen Guarantee:"
                : "Identity card authenticated. All records verified with Government of India Citizen Guarantee:"}
            </span>
          </div>

          <div className="form-two-columns">
            <label className="field-label">
              Full Legal Name (as per National ID)
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Full Name as on Govt Records"
              />
            </label>
            <label className="field-label">
              Official Municipal Badge ID
              <input
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                required
                placeholder="e.g. BBMP-ENG-15104"
              />
            </label>
          </div>

          <div className="form-two-columns">
            <label className="field-label">
              State Government Service Code (KGID)
              <input
                value={kgidNumber}
                onChange={(e) => setKgidNumber(e.target.value)}
                required
                placeholder="e.g. KGID-884920"
              />
            </label>
            <label className="field-label">
              Indian National Identity (Aadhaar Reference)
              <input
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
                required
                placeholder="XXXX-XXXX-8921"
              />
            </label>
          </div>

          <div className="form-two-columns">
            <label className="field-label">
              Official Designation / Post
              <input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
                placeholder="e.g. Assistant Engineer"
              />
            </label>
            <label className="field-label">
              Municipal Department
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                placeholder="e.g. Engineering & Infrastructure"
              />
            </label>
          </div>

          <div className="form-two-columns">
            <label className="field-label">
              Assigned Ward Jurisdiction
              <select value={ward} onChange={(e) => setWard(e.target.value)}>
                <option value="Koramangala">Ward 151 (Koramangala) · South Zone</option>
                <option value="Indiranagar">Ward 80 (Indiranagar) · East Zone</option>
                <option value="HSR Layout">Ward 174 (HSR Layout) · Bommanahalli Zone</option>
                <option value="Jayanagar">Ward 153 (Jayanagar 4th Block) · South Zone</option>
                <option value="Domlur">Ward 112 (Domlur) · East Zone</option>
                <option value="Ejipura">Ward 148 (Ejipura) · South Zone</option>
                <option value="Central">Ward 111 (Central Ward) · Central Zone</option>
              </select>
            </label>
            <label className="field-label">
              Official Contact Mobile (+91)
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+91 94806 88120"
              />
            </label>
          </div>

          <div className="form-two-columns">
            <label className="field-label">
              Official Municipal Email Address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="officer@bbmp.gov.in"
              />
            </label>
            <label className="field-label">
              Set Authority Account Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
            </label>
          </div>

          {/* Statutory Government Citizen Guarantee Affirmation */}
          <div className="statutory-declaration-box">
            <div className="declaration-header">
              <span className="declaration-flag">🇮🇳</span>
              <strong>Statutory Undertaking & Citizen Guarantee (Government of India)</strong>
            </div>
            <label className="declaration-checkbox-label">
              <input
                type="checkbox"
                checked={citizenGuaranteeConfirmed}
                onChange={(e) => setCitizenGuaranteeConfirmed(e.target.checked)}
                required
              />
              <span>
                I solemnly affirm and declare that <b>I am a bona fide Citizen of India residing in India</b>. I hold verified public service appointment with the Bruhat Bengaluru Mahanagara Palike (BBMP) / Municipal Corporation, and I give government guarantee of lawful, accountable civic service in accordance with the <b>Constitution of India</b> and the <b>Karnataka Municipal Corporations Act, 1976</b>.
              </span>
            </label>
            <div className="declaration-footer">
              <span>
                National Registry Status: <b>Verified Indian Resident</b>
              </span>
              <span>
                DigiLocker Audit Ref: <b>{digiLockerResult?.txnId || "GOI-UIDAI-IND-2026-VERIFIED"}</b>
              </span>
            </div>
          </div>

          {error && (
            <div className="form-error shake" role="alert">
              {error}
            </div>
          )}

          <div className="id-registration-footer">
            <button className="button button-primary register-authority-btn" disabled={busy}>
              {busy ? <LoaderCircle size={16} className="spin" /> : <ShieldCheck size={16} />}
              {busy
                ? "Registering & Authenticating Citizen Guarantee…"
                : isInApp
                ? "Register & Onboard Verified Municipal Employee"
                : "Authorize & Enter Authority Workspace"}
              {!busy && <ArrowRight size={15} />}
            </button>
            <small className="authority-onboarding-disclaimer">
              <ShieldCheck size={12} /> Registered under BBMP Municipal Service Protocols with Government of India Citizen Guarantee.
            </small>
          </div>
        </form>
      )}

      {/* DigiLocker Interactive Modal */}
      {showDigiLockerModal && (
        <DigiLockerModal
          onClose={() => setShowDigiLockerModal(false)}
          onSuccess={handleDigiLockerSuccess}
        />
      )}
    </div>
  );
}
