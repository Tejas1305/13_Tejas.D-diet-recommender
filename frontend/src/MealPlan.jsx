import { useEffect, useState } from "react";
import { getRecommendations } from "./api";

const MEAL_SLOTS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

function MealPlan() {
  const [meals, setMeals] = useState(null);
  const [coldStart, setColdStart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const data = await getRecommendations();
        setMeals(data.meals);
        setColdStart(Boolean(data.cold_start));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadRecommendations();
  }, []);

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

      {MEAL_SLOTS.map(({ key, label }) => (
        <section key={key} className="meal-section">
          <h3>{label}</h3>
          <div className="recipe-list">
            {(meals[key] || []).map((item) => (
              <div key={item.recipe_id} className="recipe-card">
                <div className="recipe-info">
                  <p className="recipe-title">{item.title}</p>
                  <p className="hint-text">{item.explanation}</p>
                </div>
                <div className="pill-row">
                  <span className="pill">{item.calories} cal</span>
                  <span className="pill">{item.protein}g protein</span>
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
