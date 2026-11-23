"use client";

import { useEffect } from "react";
import { divIcon, latLngBounds } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import type { CivicReport } from "@/lib/types";

const CENTER: [number, number] = [12.9432, 77.6305];
const COLORS: Record<string, string> = { reported: "#d5a34c", in_progress: "#6c8fb9", resolved: "#4d8b67" };
function pinIcon(status: string) {
  return divIcon({ className: "issue-map-pin", html: `<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg"><path d="M15 1C7.3 1 1 7.2 1 15c0 10 14 22 14 22s14-12 14-22C29 7.2 22.7 1 15 1Z" fill="${COLORS[status] || COLORS.reported}" stroke="white" stroke-width="2.5"/><circle cx="15" cy="14" r="4.5" fill="white"/></svg>`, iconSize: [30, 38], iconAnchor: [15, 38], popupAnchor: [0, -34] });
}

function FocusMap({ reports, compact, location, picking, focusId }: { reports: CivicReport[]; compact: boolean; location?: { latitude: number; longitude: number }; picking: boolean; focusId?: number | null }) {
  const map = useMap();
  useEffect(() => {
    const focused = reports.find((report) => report.id === focusId);
    if (focused && !picking) map.flyTo([focused.latitude, focused.longitude], 16, { duration: 0.6 });
    else if (picking && location) map.setView([location.latitude, location.longitude], 15);
    else if (compact) map.setView(CENTER, 13);
    else {
      // Frame the central neighborhoods; far-off reports stay reachable by panning.
      const nearby = reports.filter((report) => Math.abs(report.latitude - CENTER[0]) < 0.15 && Math.abs(report.longitude - CENTER[1]) < 0.15);
      if (nearby.length > 1) map.fitBounds(latLngBounds(nearby.map((report) => [report.latitude, report.longitude] as [number, number])), { padding: compact ? [24, 24] : [55, 55], maxZoom: compact ? 13 : 14 });
      else map.setView(CENTER, 13);
    }
  }, [map, reports, compact, picking, location?.latitude, location?.longitude]);
  return null;
}

function PickLocation({ location, onChange }: { location: { latitude: number; longitude: number }; onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click(event) { onChange(event.latlng.lat, event.latlng.lng); } });
  return <Marker position={[location.latitude, location.longitude]} icon={pinIcon("resolved")} draggable eventHandlers={{ dragend(event) { const position = event.target.getLatLng(); onChange(position.lat, position.lng); } }} />;
}

export default function CivicMap({ reports, onSelect, compact = false, location, onLocationPick, focusId }: { reports: CivicReport[]; onSelect?: (id: number) => void; compact?: boolean; location?: { latitude: number; longitude: number }; onLocationPick?: (lat: number, lng: number) => void; focusId?: number | null }) {
  const picking = Boolean(onLocationPick);
  return <MapContainer center={CENTER} zoom={13} zoomSnap={0.5} zoomControl={false} scrollWheelZoom={!compact} className={`civic-map ${compact ? "compact-map" : ""}`} attributionControl={true}>
    <TileLayer url="/api/map-tiles/{z}/{x}/{y}" maxZoom={19} attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &middot; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a>' />
    <FocusMap reports={reports} compact={compact} location={location} picking={picking} focusId={focusId} />
    {picking && location ? <PickLocation location={location} onChange={(lat, lng) => onLocationPick?.(lat, lng)} /> : reports.map((report) => <Marker key={report.id} position={[report.latitude, report.longitude]} icon={pinIcon(report.status)} title={report.title} alt={`Map pin: ${report.title}`}>
      <Popup>
        <div className="map-popup">
          <div className="map-popup-photo-wrap">
            <img src={report.imageUrl} alt={report.title} className="map-popup-photo" />
          </div>
          <span className={`status-badge ${report.status}`}><i />{report.status === "in_progress" ? "In progress" : report.status === "resolved" ? "Resolved" : "Reported"}</span>
          <strong>{report.title}</strong>
          <p>{report.locality}, Bengaluru</p>
          <button onClick={() => onSelect?.(report.id)}>View report →</button>
        </div>
      </Popup>
    </Marker>)}
    <ZoomControl position="bottomright" />
  </MapContainer>;
}
