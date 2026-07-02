import { useState } from "react";
import { signup } from "./api";

function Signup({ onSignedUp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    try {
      await signup(email, password);
      onSignedUp();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h2>Sign up</h2>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleSubmit}>Sign up</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default Signup;