import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "public", "images");
const LOCATIONS_DIR = path.join(IMAGES_DIR, "locations");

fs.mkdirSync(LOCATIONS_DIR, { recursive: true });

const IMAGES_TO_FETCH = [
  // Categories / Issues
  {
    path: path.join(IMAGES_DIR, "road.jpg"),
    url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
    label: "Roads & potholes",
  },
  {
    path: path.join(IMAGES_DIR, "waste.jpg"),
    url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80",
    label: "Waste management",
  },
  {
    path: path.join(IMAGES_DIR, "streetlight.jpg"),
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    label: "Streetlights",
  },
  {
    path: path.join(IMAGES_DIR, "water.jpg"),
    url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80",
    label: "Water & drainage",
  },
  {
    path: path.join(IMAGES_DIR, "park.jpg"),
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
    label: "Parks & trees",
  },
  {
    path: path.join(IMAGES_DIR, "public-space.jpg"),
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    label: "Public spaces",
  },

  // Demo Municipal Locations / Wards
  {
    path: path.join(LOCATIONS_DIR, "koramangala.jpg"),
    url: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80",
    label: "Ward 151 - Koramangala",
  },
  {
    path: path.join(LOCATIONS_DIR, "indiranagar.jpg"),
    url: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
    label: "Ward 80 - Indiranagar",
  },
  {
    path: path.join(LOCATIONS_DIR, "hsr-layout.jpg"),
    url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    label: "Ward 174 - HSR Layout",
  },
  {
    path: path.join(LOCATIONS_DIR, "jayanagar.jpg"),
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    label: "Ward 153 - Jayanagar",
  },
  {
    path: path.join(LOCATIONS_DIR, "domlur.jpg"),
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    label: "Ward 112 - Domlur",
  },
  {
    path: path.join(LOCATIONS_DIR, "ejipura.jpg"),
    url: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80",
    label: "Ward 148 - Ejipura",
  },
  {
    path: path.join(LOCATIONS_DIR, "central.jpg"),
    url: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80",
    label: "Ward 111 - Central Municipal Ward",
  },

  // Public Servants / Officers
  {
    path: path.join(IMAGES_DIR, "worker-1.jpg"),
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    label: "Kavitha N. Rao (Engineer)",
  },
  {
    path: path.join(IMAGES_DIR, "worker-2.jpg"),
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    label: "Santosh Kumar (Field Lead)",
  },
  {
    path: path.join(IMAGES_DIR, "worker-3.jpg"),
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    label: "Vinay Mohan Reddy (Superintendent)",
  },
];

async function downloadPhoto(item) {
  try {
    console.log(`Downloading ${item.label}...`);
    const res = await fetch(item.url, {
      headers: {
        "User-Agent": "CivicFix-App/1.0",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(item.path, buffer);
    console.log(`✓ Saved ${path.basename(item.path)} (${(buffer.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.warn(`Failed downloading ${item.label}: ${err.message}. Generating fallback...`);
    // Generate a fallback SVG/JPEG if download fails
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e3a24"/>
          <stop offset="100%" stop-color="#3c6544"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">${item.label}</text>
      <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="16" fill="#c3e4c8" text-anchor="middle">Bengaluru Municipal Civic Infrastructure</text>
    </svg>`;
    fs.writeFileSync(item.path, Buffer.from(fallbackSvg));
  }
}

async function main() {
  console.log("=== Fetching Photos for Demo Locations, Issues, and Municipal Officers ===");
  for (const item of IMAGES_TO_FETCH) {
    await downloadPhoto(item);
  }
  console.log("\nAll photos ready!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

