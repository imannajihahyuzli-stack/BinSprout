import { useEffect, useRef, useState } from "react";
import "./App.css";

const MODEL_BASE =
  "https://huggingface.co/pastelpinkyunicorn/binsprout-classifier/resolve/main/";
const THRESHOLD = 0.6; // below this, the model is "not sure"

export default function App() {
  const modelRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("Take or upload a photo of one ingredient.");
  const [ingredients, setIngredients] = useState([]);
  const [manual, setManual] = useState("");

  // Load the model once, when the page opens
  useEffect(() => {
    window.tmImage
      .load(MODEL_BASE + "model.json", MODEL_BASE + "metadata.json")
      .then((m) => {
        modelRef.current = m;
        setReady(true);
      })
      .catch(() => setLoadError("Could not load the model. Check the link."));
  }, []);

  function addIngredient(name) {
    const clean = name.trim().toLowerCase();
    if (!clean) return;
    setIngredients((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
  }

  function removeIngredient(name) {
    setIngredients((prev) => prev.filter((i) => i !== name));
  }

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file || !modelRef.current) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    setMessage("Checking...");

    const img = new Image();
    img.src = url;
    await img.decode();

    const predictions = await modelRef.current.predict(img);
    const best = [...predictions].sort((a, b) => b.probability - a.probability)[0];
    const percent = Math.round(best.probability * 100);

    if (best.className.toLowerCase() === "non-food") {
      setMessage("That doesn't look like an ingredient. Try another photo.");
    } else if (best.probability < THRESHOLD) {
      setMessage(`Not sure (best guess: ${best.className}, ${percent}%). Please type it in below.`);
    } else {
      addIngredient(best.className);
      setMessage(`Detected ${best.className} (${percent}%)`);
    }
    e.target.value = ""; // lets you pick the same photo again
  }

  function handleManualAdd() {
    addIngredient(manual);
    setManual("");
  }

  return (
    <main className="app">
      <h1>BinSprout</h1>
      <p className="tagline">Snap your ingredients. Waste less food.</p>

      {loadError && <p className="error">{loadError}</p>}
      {!ready && !loadError && <p>Loading the AI model...</p>}

      <label className="button">
        Take / upload photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          disabled={!ready}
          hidden
        />
      </label>

      {preview && <img className="preview" src={preview} alt="Your ingredient" />}
      <p className="message">{message}</p>

      <h2>Your ingredients</h2>
      {ingredients.length === 0 && <p>None yet.</p>}
      <ul className="chips">
        {ingredients.map((name) => (
          <li key={name}>
            {name}
            <button onClick={() => removeIngredient(name)} aria-label={`Remove ${name}`}>
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="manual">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleManualAdd()}
          placeholder="Type an ingredient"
        />
        <button onClick={handleManualAdd}>Add</button>
      </div>

      <p className="footer">When in doubt, throw it out.</p>
    </main>
  );
}