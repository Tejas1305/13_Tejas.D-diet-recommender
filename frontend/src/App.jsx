import { useState } from "react";
import Login from "./Login";
import Signup from "./Signup";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [showSignup, setShowSignup] = useState(false);

  function handleLoggedIn() {
    setToken(localStorage.getItem("token"));
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken(null);
  }

  if (token) {
    return (
      <div className="auth-page">
        <h1>Diet Recommender</h1>
        <div className="card">
          <p>You are logged in.</p>
          <button onClick={handleLogout}>Log out</button>
        </div>
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