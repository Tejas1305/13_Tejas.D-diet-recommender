import { useEffect, useState } from "react";

function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch((err) => setHealth({ error: String(err) }));
  }, []);

  return (
    <div>
      <h1>Diet Recommender</h1>
      <pre>{health ? JSON.stringify(health, null, 2) : "checking..."}</pre>
    </div>
  );
}

export default App;