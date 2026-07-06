import { useEffect, useState } from "react";
import { getFavorites, removeFavorite, getRecipeDetails } from "./api";

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState("");

  useEffect(() => {
    getFavorites()
      .then(setFavorites)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleUnsave(recipeId) {
    try {
      await removeFavorite(recipeId);
      setFavorites((prev) => prev.filter((item) => item.recipe_id !== recipeId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function openRecipe(recipeId) {
    setSelectedRecipe(null);
    setRecipeError("");
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

  if (loading) {
    return (
      <div className="card favorites-card">
        <p>Loading your favorites...</p>
      </div>
    );
  }

  const showModal = recipeLoading || selectedRecipe || recipeError;

  return (
    <div className="card favorites-card">
      <h2>Favorites</h2>

      {error && <p className="error">{error}</p>}

      {favorites.length === 0 ? (
        <p className="hint-text">You haven't saved any meals yet.</p>
      ) : (
        <div className="recipe-list">
          {favorites.map((item) => (
            <div key={item.recipe_id} className="recipe-card">
              <div className="recipe-card-top" onClick={() => openRecipe(item.recipe_id)}>
                <p className="recipe-title">{item.title}</p>
                <button
                  type="button"
                  className="unsave-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnsave(item.recipe_id);
                  }}
                >
                  Unsave
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                      <li key={i}>{ingredient}</li>
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

export default Favorites;
