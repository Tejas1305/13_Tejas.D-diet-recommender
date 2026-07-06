import { useState, useEffect } from "react";
import Login from "./Login";
import Signup from "./Signup";
import Preferences from "./Preferences";
import MealPlan from "./MealPlan";
import { getPreferences } from "./api";

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
        <h1>Diet Recommender</h1>
        {view === "preferences" ? (
          <Preferences onSaved={() => setView("mealplan")} />
        ) : (
          <>
            <MealPlan />
            <button className="link-button" onClick={() => setView("preferences")}>
              ← Edit preferences
            </button>
          </>
        )}
        <button className="link-button" onClick={handleLogout}>Log out</button>
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