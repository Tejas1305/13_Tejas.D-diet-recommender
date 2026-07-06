const BASE = "http://localhost:8000/api/v1";

export async function signup(email, password) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Signup failed");
  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
  return res.json();
}

export async function getPreferences() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to load preferences");
  return res.json();
}

export async function updatePreferences(prefs) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to update preferences");
  return res.json();
}

export async function getRecommendations() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref/recommendations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to fetch recommendations");
  return res.json();
}