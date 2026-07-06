import { useEffect, useState } from "react";
import {
  getRecommendations,
  rateRecipe,
  getRecipeDetails,
  addShoppingItem,
  getFavorites,
  addFavorite,
  removeFavorite,
} from "./api";

const MEAL_SLOTS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

const STARS = [1, 2, 3, 4, 5];

function MealPlan() {
  const [meals, setMeals] = useState(null);
  const [coldStart, setColdStart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [rateError, setRateError] = useState("");
  const [ratings, setRatings] = useState({});
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState("");
  const [addedItems, setAddedItems] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [favError, setFavError] = useState("");

  async function fetchPlan() {
    const data = await getRecommendations();
    setMeals(data.meals);
    setColdStart(Boolean(data.cold_start));
  }

  useEffect(() => {
    fetchPlan()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    getFavorites()
      .then((data) => setFavorites(data.map((f) => f.recipe_id)))
      .catch((err) => setFavError(err.message));
  }, []);

  async function toggleFavorite(recipeId, title) {
    setFavError("");
    try {
      if (favorites.includes(recipeId)) {
        await removeFavorite(recipeId);
        setFavorites((prev) => prev.filter((id) => id !== recipeId));
      } else {
        await addFavorite(recipeId, title);
        setFavorites((prev) => [...prev, recipeId]);
      }
    } catch (err) {
      setFavError(err.message);
    }
  }

  async function handleRate(recipeId, value) {
    setRateError("");
    setRatings((prev) => ({ ...prev, [recipeId]: value }));
    try {
      await rateRecipe(recipeId, value);
    } catch (err) {
      setRateError(err.message);
    }
  }

  async function handleGenerateNewPlan() {
    setRateError("");
    setRefreshing(true);
    try {
      await fetchPlan();
    } catch (err) {
      setRateError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function openRecipe(recipeId) {
    setSelectedRecipe(null);
    setRecipeError("");
    setAddedItems({});
    setRecipeLoading(true);
    try {
      const data = await getRecipeDetails(recipeId);
      setSelectedRecipe(data);
    } catch (err) {
      setRecipeError(err.message);
    } finally {
      setRecipeLoading(false);
    }
  }

  function closeRecipe() {
    setSelectedRecipe(null);
    setRecipeError("");
  }

  async function handleAddItem(ingredient, index) {
    try {
      await addShoppingItem(ingredient);
      setAddedItems((prev) => ({ ...prev, [index]: true }));
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [index]: false }));
      }, 2000);
    } catch (err) {
      setRecipeError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="card meal-plan-card">
        <p>Loading your meal plan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card meal-plan-card">
        <p className="error">{error}</p>
      </div>
    );
  }

  const showModal = recipeLoading || selectedRecipe || recipeError;

  return (
    <div className="card meal-plan-card">
      <h2>Today's Meal Plan</h2>

      <button type="button" onClick={handleGenerateNewPlan} disabled={refreshing}>
        {refreshing ? "Generating..." : "Generate New Plan"}
      </button>

      {coldStart && (
        <div className="cold-start-banner">
          These are popular starting picks — rate a few meals and we'll learn your taste from there.
        </div>
      )}

      {refreshing && <p className="hint-text">Generating a new plan...</p>}
      {rateError && <p className="error">{rateError}</p>}
      {favError && <p className="error">{favError}</p>}

      <div className="meal-grid">
        {MEAL_SLOTS.map(({ key, label }) => (
          <section key={key} className="meal-section">
            <h3>{label}</h3>
            <div className="recipe-list">
              {(meals[key] || []).map((item) => (
                <div key={item.recipe_id} className="recipe-card">
                  <div className="recipe-card-top" onClick={() => openRecipe(item.recipe_id)}>
                    <div className="recipe-info">
                      <p className="recipe-title">{item.title}</p>
                      <p className="hint-text">{item.explanation}</p>
                    </div>
                    <div className="recipe-card-actions">
                      <div className="pill-row">
                        <span className="pill">{item.calories} cal</span>
                        <span className="pill">{item.protein}g protein</span>
                      </div>
                      <button
                        type="button"
                        className={`favorite-button ${favorites.includes(item.recipe_id) ? "favorited" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.recipe_id, item.title);
                        }}
                      >
                        {favorites.includes(item.recipe_id) ? "♥" : "♡"}
                      </button>
                    </div>
                  </div>

                  <div className="rating-container">
                    {STARS.map((star) => (
                      <button
                        key={star}
                        type="button"
                        disabled={refreshing}
                        className={`star ${star <= (ratings[item.recipe_id] || 0) ? "filled" : ""}`}
                        onClick={() => handleRate(item.recipe_id, star)}
                      >
                        {star <= (ratings[item.recipe_id] || 0) ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeRecipe}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close-button" onClick={closeRecipe}>×</button>

            {recipeLoading && <p>Loading recipe...</p>}
            {recipeError && <p className="error">{recipeError}</p>}

            {selectedRecipe && (
              <>
                <h2>{selectedRecipe.title}</h2>
                <div className="pill-row">
                  <span className="pill">{selectedRecipe.calories} cal</span>
                  <span className="pill">{selectedRecipe.protein}g protein</span>
                </div>

                <div className="recipe-details-section">
                  <h3>Ingredients</h3>
                  <ul>
                    {selectedRecipe.ingredients.map((ingredient, i) => (
                      <li key={i}>
                        <span>{ingredient}</span>
                        <button
                          type="button"
                          className="add-item-button"
                          onClick={() => handleAddItem(ingredient, i)}
                        >
                          {addedItems[i] ? "✓" : "+"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="recipe-details-section">
                  <h3>Directions</h3>
                  <ol>
                    {selectedRecipe.directions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MealPlan;
