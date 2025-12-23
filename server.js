import express from "express";
import fetch from "node-fetch";

const app = express();

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Token broker running on port ${PORT}`));
