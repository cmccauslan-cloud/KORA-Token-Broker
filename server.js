import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());


// --- Spotify OAuth callback ---
app.get("/callback", (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("No authorization code found in request");
  }

  res.send(`
    <h2>Authorization successful!</h2>
    <p>Your code is:</p>
    <pre>${code}</pre>
    <p>Copy this code and use it to request your refresh token.</p>
  `);
});

// --- Token exchange route ---
app.get("/token", async (req, res) => {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  try {
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await r.json();
    res.json({ data });
    console.log("Spotify response:", data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to refresh token", details: err.message });
  }
});

// --- Root route (for quick test) ---
app.get("/", (req, res) => {
  res.send("KORA Token Broker is running ✅");
});
// --- Helper: get a fresh access token for other routes ---
async function getAccessToken() {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await r.json();
  return data.access_token;
}

// === Spotify Playback Routes ===
// ▶️ Play a specific song
app.post("/spotify_play", async (req, res) => {
  const token = await getAccessToken();
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });

  const search = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  ).then(r => r.json());

  if (!search.tracks?.items?.length) {
    return res.status(404).json({ error: "Track not found" });
  }

  const uri = search.tracks.items[0].uri;
  await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uris: [uri] }),
  });

  res.json({ message: "Playback started", uri });
});

// ⏸ Pause
app.post("/spotify_pause", async (req, res) => {
  const token = await getAccessToken();
  await fetch("https://api.spotify.com/v1/me/player/pause", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  res.json({ message: "Playback paused" });
});

// (then paste all the /spotify_play, /spotify_pause, /spotify_resume, etc. routes I showed you)
// ▶ Resume
app.post("/spotify_resume", async (req, res) => {
  const token = await getAccessToken();
  await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  res.json({ message: "Playback resumed" });
});

// ⏭ Skip to next track
app.post("/spotify_skip", async (req, res) => {
  const token = await getAccessToken();
  await fetch("https://api.spotify.com/v1/me/player/next", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  res.json({ message: "Skipped to next track" });
});

// ⏮ Go to previous track
app.post("/spotify_previous", async (req, res) => {
  const token = await getAccessToken();
  await fetch("https://api.spotify.com/v1/me/player/previous", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  res.json({ message: "Returned to previous track" });
});

// 🎧 Get current track info
app.get("/spotify_now_playing", async (req, res) => {
  const token = await getAccessToken();

  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Spotify returns 204 No Content if nothing is playing
    if (response.status === 204) {
      return res.json({ message: "Nothing playing right now." });
    }

    const data = await response.json();

    if (!data?.item) {
      return res.json({ message: "No track info available." });
    }

    res.json({
      track_name: data.item.name,
      artist_name: data.item.artists.map(a => a.name).join(", "),
      album_name: data.item.album.name,
      is_playing: data.is_playing,
    });
  } catch (error) {
    console.error("Error fetching now playing:", error);
    res.status(500).json({ error: "Failed to get current track info." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Token broker running on port ${PORT}`));
