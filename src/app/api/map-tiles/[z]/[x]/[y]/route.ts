export const dynamic = "force-dynamic";

type Context = { params: Promise<{ z: string; x: string; y: string }> };

const OSM_TILE_URL = "https://tile.openstreetmap.org";
const USER_AGENT = "CivicFix/1.0 (community civic reporting app; contact via project maintainer)";

// Proxies map tiles so provider keys never reach the browser.
// With MAPTILER_API_KEY set, tiles come from MapTiler; otherwise from
// OpenStreetMap (no key required). Responses are cached on the server and by the browser.
export async function GET(_request: Request, context: Context) {
  const { z, x, y } = await context.params;
  if (![z, x, y].every((value) => /^\d+$/.test(value))) return new Response("Invalid tile", { status: 400 });

  const zoom = Number(z);
  const max = 2 ** zoom;
  if (zoom > 19 || Number(x) >= max || Number(y) >= max) return new Response("Tile out of range", { status: 400 });

  const key = process.env.MAPTILER_API_KEY?.trim();
  const upstream = key
    ? `https://api.maptiler.com/maps/${(process.env.MAPTILER_MAP_ID?.trim() || "streets-v2").replace(/[^a-zA-Z0-9_-]/g, "")}/256/${z}/${x}/${y}.png?key=${encodeURIComponent(key)}`
    : `${OSM_TILE_URL}/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(upstream, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/png,image/*;q=0.8" },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!response.ok) {
      console.error(`Map tile provider responded with ${response.status} for tile ${z}/${x}/${y}`);
      return new Response("Map tile unavailable", { status: 502 });
    }
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("Map tile request failed", error);
    return new Response("Map tile unavailable", { status: 502 });
  }
}
