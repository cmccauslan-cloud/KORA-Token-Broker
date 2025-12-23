import express from "express";
import fetch from "node-fetch";

const app = express();

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
    res.status(500).json({ error: "Failed to refresh token", details: err.message });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Token broker running")
);
