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

export async function getRecipeDetails(recipeId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref/recipes/${recipeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Failed to fetch recipe details");
  }
  return res.json();
}

export async function rateRecipe(recipeId, rating) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref/rate`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ recipe_id: recipeId, rating: rating }),
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Failed to submit rating");
  }
  return res.json();
}

export async function getShoppingList() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref/shopping`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch shopping list");
  return res.json();
}

export async function addShoppingItem(ingredient) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref/shopping`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ ingredient_name: ingredient }),
  });
  if (!res.ok) throw new Error("Failed to add item");
  return res.json();
}

export async function toggleShoppingItem(itemId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref/shopping/${itemId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to toggle item");
  return res.json();
}

export async function clearBoughtItems() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref/shopping`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to clear items");
  return res.json();
}

export async function getFavorites() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch favorites");
  return res.json();
}

export async function addFavorite(recipeId, title) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref/favorites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ recipe_id: recipeId, title }),
  });
  if (!res.ok) throw new Error("Failed to add favorite");
  return res.json();
}

export async function removeFavorite(recipeId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/pref/favorites/${recipeId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to remove favorite");
  return res.json();
}