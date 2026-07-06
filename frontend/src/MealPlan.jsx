import { useEffect, useState } from "react";
import { getRecommendations, rateRecipe } from "./api";

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

  async function fetchPlan() {
    const data = await getRecommendations();
    setMeals(data.meals);
    setColdStart(Boolean(data.cold_start));
  }

  useEffect(() => {
    fetchPlan()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleRate(recipeId, value) {
    setRateError("");
    setRatings((prev) => ({ ...prev, [recipeId]: value }));
    setRefreshing(true);
    try {
      await rateRecipe(recipeId, value);
      await fetchPlan();
    } catch (err) {
      setRateError(err.message);
    } finally {
      setRefreshing(false);
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

  return (
    <div className="card meal-plan-card">
      <h2>Today's Meal Plan</h2>

      {coldStart && (
        <div className="cold-start-banner">
          These are popular starting picks — rate a few meals and we'll learn your taste from there.
        </div>
      )}

      {refreshing && <p className="hint-text">Updating your recommendations...</p>}
      {rateError && <p className="error">{rateError}</p>}

      {MEAL_SLOTS.map(({ key, label }) => (
        <section key={key} className="meal-section">
          <h3>{label}</h3>
          <div className="recipe-list">
            {(meals[key] || []).map((item) => (
              <div key={item.recipe_id} className="recipe-card">
                <div className="recipe-card-top">
                  <div className="recipe-info">
                    <p className="recipe-title">{item.title}</p>
                    <p className="hint-text">{item.explanation}</p>
                  </div>
                  <div className="pill-row">
                    <span className="pill">{item.calories} cal</span>
                    <span className="pill">{item.protein}g protein</span>
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
  );
}

export default MealPlan;
