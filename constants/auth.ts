export const API_URL = "http://localhost:5164";
export const CLIENT_ID = "5f758f2be85d4ae3b816ac89b17e3448";
export const REDIRECT_URI = "mf://callback";
export const BACKEND_REDIRECT_URI = "mf://callback"; // Must match REDIRECT_URI for Spotify token exchange

export const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-read-recently-played",
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-modify-playback-state",
  "user-read-playback-state",
  "user-read-currently-playing",
].join(" ");
