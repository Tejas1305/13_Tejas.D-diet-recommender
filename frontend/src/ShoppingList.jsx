import { useEffect, useState } from "react";
import { getShoppingList, toggleShoppingItem, clearBoughtItems } from "./api";

function ShoppingList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getShoppingList()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(itemId) {
    try {
      const updated = await toggleShoppingItem(itemId);
      setItems((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleClear() {
    try {
      await clearBoughtItems();
      setItems((prev) => prev.filter((item) => !item.is_bought));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="card shopping-card">
        <p>Loading your shopping list...</p>
      </div>
    );
  }

  const hasBought = items.some((item) => item.is_bought);

  return (
    <div className="card shopping-card">
      <h2>Shopping List</h2>

      {error && <p className="error">{error}</p>}

      {items.length === 0 ? (
        <p className="hint-text">Your shopping list is empty.</p>
      ) : (
        <ul className="shopping-list">
          {items.map((item) => (
            <li key={item.id} className="shopping-item" onClick={() => handleToggle(item.id)}>
              <span className={`checkbox ${item.is_bought ? "checked" : ""}`}>
                {item.is_bought ? "✓" : ""}
              </span>
              <span className={item.is_bought ? "bought-text" : ""}>{item.ingredient_name}</span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={handleClear} disabled={!hasBought}>
        Clear crossed off items
      </button>
    </div>
  );
}

export default ShoppingList;
