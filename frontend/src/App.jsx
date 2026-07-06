import { useState, useEffect } from "react";
import Login from "./Login";
import Signup from "./Signup";
import Preferences from "./Preferences";
import MealPlan from "./MealPlan";
import ShoppingList from "./ShoppingList";
import Favorites from "./Favorites";
import { getPreferences } from "./api";

const NAV_ITEMS = [
  { key: "mealplan", label: "Meal Plan" },
  { key: "shopping", label: "Shopping List" },
  { key: "favorites", label: "Favorites" },
  { key: "preferences", label: "Preferences" },
];

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [showSignup, setShowSignup] = useState(false);
  const [view, setView] = useState("");

  useEffect(() => {
    if (token) {
      getPreferences()
        .then((data) => setView(data.height ? "mealplan" : "preferences"))
        .catch(() => setView("preferences"));
    }
  }, [token]);

  function handleLoggedIn() {
    setToken(localStorage.getItem("token"));
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken(null);
    setView("preferences");
  }

  if (token) {
    if (!view) return <div className="auth-page"><p>Loading profile...</p></div>;

    return (
      <div className="auth-page">
        <header className="app-header">
          <h1>Diet Recommender</h1>
          <nav className="app-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`pill-button ${view === item.key ? "selected" : ""}`}
                onClick={() => setView(item.key)}
              >
                {item.label}
              </button>
            ))}
            <button type="button" className="link-button" onClick={handleLogout}>Log out</button>
          </nav>
        </header>

        {view === "preferences" && <Preferences onSaved={() => setView("mealplan")} />}
        {view === "mealplan" && <MealPlan />}
        {view === "shopping" && <ShoppingList />}
        {view === "favorites" && <Favorites />}
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>Diet Recommender</h1>
      {showSignup ? (
        <>
          <Signup onSignedUp={() => setShowSignup(false)} />
          <button className="link-button" onClick={() => setShowSignup(false)}>Have an account? Log in</button>
        </>
      ) : (
        <>
          <Login onLoggedIn={handleLoggedIn} />
          <button className="link-button" onClick={() => setShowSignup(true)}>Need an account? Sign up</button>
        </>
      )}
    </div>
  );
}

export default App;