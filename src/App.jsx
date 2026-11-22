import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

// Keep your friend's existing AI model address and confidence threshold.
const MODEL_BASE =
  "https://huggingface.co/pastelpinkyunicorn/binsprout-classifier/resolve/main/";
const THRESHOLD = 0.6;

const icons = {
  Home: <path d="M3 10 12 3l9 7v10h-6v-6H9v6H3z" />,
  Basket: <><path d="m3 9 2 12h14l2-12zM7 9l5-6 5 6M9 13v4m6-4v4" /></>,
  History: <><path d="M3 12a9 9 0 1 1 3 7M3 5v7h7m2-5v5l4 2" /></>,
  Camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3z" /><circle cx="12" cy="13" r="3" /></>,
  Keyboard: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h1m4 0h1m4 0h1M6 13h1m4 0h1m4 0h1m-8 3h6" /></>,
  Leaf: <path d="M5 19c-4-8 1-14 14-15 0 11-4 16-11 14m-4 3 9-10" />,
  Arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
};

function Icon({ name }) {
  return (
    <svg className="sb-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

const primaryPages = ["Home", "Basket", "History"];
const historyKey = "savebite.recipeHistory";
const historyDate = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function readRecipeHistory() {
  try {
    const entries = JSON.parse(window.localStorage.getItem(historyKey));
    return Array.isArray(entries) ? entries.filter((entry) =>
      typeof entry?.id === "string" &&
      Number.isFinite(Date.parse(entry.createdAt)) &&
      Array.isArray(entry.ingredients) &&
      entry.ingredients.every((ingredient) => typeof ingredient === "string") &&
      typeof entry.text === "string" && entry.text.trim()
    ) : [];
  } catch {
    return [];
  }
}

function currentPage() {
  let page = "Home";
  try {
    page = decodeURIComponent(window.location.hash.slice(1) || "Home");
  } catch {
    return "Home";
  }
  return ["Home", "Upload Photo", "Type Ingredient", "Basket", "Recipe Results", "History"].includes(page)
    ? page
    : "Home";
}

export default function App() {
  const modelRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("Take or upload a photo of one ingredient.");
  const [ingredients, setIngredients] = useState([]);
  const [manual, setManual] = useState("");
  const [recipes, setRecipes] = useState("");
  const [recipeHistory, setRecipeHistory] = useState(readRecipeHistory);
  const [historyStorageFailed, setHistoryStorageFailed] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [page, setPage] = useState(currentPage);

  function go(target) {
    window.location.hash = encodeURIComponent(target);
    setPage(target);
    window.scrollTo(0, 0);
  }

  useEffect(() => {
    const onHashChange = () => setPage(currentPage());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (!historyStorageFailed && (event.key === historyKey || event.key === null)) {
        setRecipeHistory(readRecipeHistory());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [historyStorageFailed]);

  useEffect(() => {
    document.title = `${page} · SaveBite`;
  }, [page]);

  // Original AI model-loading logic retained.
  useEffect(() => {
    if (!window.tmImage?.load) {
      setLoadError("Could not load the model. Check the link.");
      return;
    }
    window.tmImage
      .load(MODEL_BASE + "model.json", MODEL_BASE + "metadata.json")
      .then((m) => {
        modelRef.current = m;
        setReady(true);
      })
      .catch(() => setLoadError("Could not load the model. Check the link."));
  }, []);

  // Original ingredient logic retained.
  function addIngredient(name) {
    const clean = name.trim().toLowerCase();
    if (!clean) return;
    setIngredients((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
  }

  function removeIngredient(name) {
    setIngredients((prev) => prev.filter((i) => i !== name));
  }

  // Original AI image recognition and 60% threshold retained.
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
    e.target.value = "";
  }

  function handleManualAdd() {
    addIngredient(manual);
    setManual("");
  }

  function saveRecipe(text) {
    const entry = {
      id: globalThis.crypto.getRandomValues(new Uint32Array(4)).join("-"),
      createdAt: new Date().toISOString(),
      ingredients,
      text,
    };
    try {
      const storedHistory = readRecipeHistory();
      const history = [entry, ...storedHistory];
      if (historyStorageFailed) {
        history.push(...recipeHistory.filter((item) =>
          !storedHistory.some((stored) => stored.id === item.id)
        ));
      }
      window.localStorage.setItem(historyKey, JSON.stringify(history));
      setRecipeHistory(history);
      setHistoryStorageFailed(false);
    } catch {
      setRecipeHistory((previous) => [entry, ...previous]);
      setHistoryStorageFailed(true);
    }
  }

  async function getRecipes() {
    setLoadingRecipes(true);
    setRecipes("");
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      });
      const data = await res.json();
      setRecipes(data.text);
      if (res.ok && typeof data.text === "string" && data.text.trim()) {
        saveRecipe(data.text);
      }
    } catch {
      setRecipes("Could not reach the server. Is it running?");
    }
    setLoadingRecipes(false);
    go("Recipe Results");
  }

  const active = ["Upload Photo", "Type Ingredient", "Recipe Results"].includes(page) ? "Basket" : page;

  const navButton = (title) => (
    <a key={title} href={`#${encodeURIComponent(title)}`} className="sb-nav-link"
      aria-current={active === title ? "page" : undefined}>
      <span className="sb-nav-icon"><Icon name={title} /></span>
      <span>{title}</span>
    </a>
  );

  const banner = (title, intro, symbol) => (
    <section className="sb-banner sb-subpage-banner">
      <div>
        <span className="sb-small-icon"><Icon name={symbol} /></span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
    </section>
  );

  function homeScreen() {
    return (
      <>
        <section className="sb-welcome">
          <div><h1>Welcome to SaveBite!</h1><p>Let's turn what you have into something delicious!</p></div>
          <span className="sb-welcome-art" aria-hidden="true" />
        </section>
        <div className="sb-home-columns">
          <section className="sb-home-actions">
            <h2>What's in your kitchen?</h2>
            <p>Add your ingredients and let AI do its magic.</p>
            <div className="sb-home-grid">
              <a className="sb-home-card" href="#Upload%20Photo">
                <span className="sb-small-icon"><Icon name="Camera" /></span>
                <strong>Upload Photo</strong><p>Let AI identify your ingredient</p>
              </a>
              <a className="sb-home-card" href="#Type%20Ingredient">
                <span className="sb-small-icon"><Icon name="Keyboard" /></span>
                <strong>Type Ingredient</strong><p>Add an ingredient manually</p>
              </a>
            </div>
          </section>
          <aside className="sb-home-side">
            <a className="sb-home-basket" href="#Basket">
              <Icon name="Basket" />
              <span><strong>My Ingredient Basket</strong><p>See what you've added so far.</p></span>
              <span className="sb-arrow"><Icon name="Arrow" /></span>
            </a>
            <article className="sb-home-tip">
              <h2><span className="sb-small-icon"><Icon name="Leaf" /></span>SaveBite Tip</h2>
              <p>Check your fridge before buying more food. Every little effort helps reduce food waste!</p>
            </article>
          </aside>
        </div>
      </>
    );
  }

  function uploadScreen() {
    return (
      <div className="sb-subpage">
        {banner("Upload a photo", "Choose a clear photo of one ingredient.", "Camera")}
        <article className="sb-content-card">
          <h2>Ingredient photo</h2>
          <p>JPG, PNG or WebP</p>
          {loadError && <p className="sb-error" role="alert">{loadError}</p>}
          {!ready && !loadError && <p>Loading the AI model...</p>}
          <label className={`sb-primary sb-upload-button ${!ready ? "sb-disabled" : ""}`}>
            Take Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              disabled={!ready}
              hidden
            />
          </label>
          <label className={`sb-secondary sb-upload-button ${!ready ? "sb-disabled" : ""}`}>
            Upload Photo
            <input
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              disabled={!ready}
              hidden
            />
          </label>
          {preview && <img className="sb-photo-preview" src={preview} alt="Selected ingredient" />}
          <p className="sb-photo-message" aria-live="polite">{message}</p>
          <a className="sb-secondary" href="#Basket">Review ingredient basket</a>
          <a className="sb-secondary" href="#Type%20Ingredient">Type ingredients instead</a>
        </article>
      </div>
    );
  }

  function typeScreen() {
    return (
      <div className="sb-subpage">
        {banner("Add an ingredient", "Enter an ingredient name to add it to your basket.", "Keyboard")}
        <article className="sb-content-card">
          <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { handleManualAdd(); go("Basket"); } }}>
            <label>Ingredient<input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="e.g. Carrot" /></label>
            <button className="sb-primary" type="submit" disabled={!manual.trim()}>Add to Basket</button>
          </form>
          <a className="sb-secondary" href="#Upload%20Photo">Upload a photo instead</a>
        </article>
      </div>
    );
  }

  function basketScreen() {
    return (
      <div className="sb-subpage">
        {banner("My Ingredient Basket", "Review what you have before generating recipes.", "Basket")}
        <div className="sb-list">
          {ingredients.length === 0 ? (
            <article className="sb-content-card"><h2>Your basket is empty</h2><p>Add ingredients you already have to get recipe ideas.</p></article>
          ) : ingredients.map((item) => (
            <article className="sb-ingredient-item" key={item}>
              <div><h2>{item}</h2><p>Ingredient added to your basket</p></div>
              <button className="sb-remove" type="button" onClick={() => removeIngredient(item)}>Remove</button>
            </article>
          ))}
          <a className="sb-secondary" href="#Type%20Ingredient">Add another ingredient</a>
          <a className="sb-secondary" href="#Upload%20Photo">Upload a photo</a>
          <button className="sb-primary" type="button" onClick={getRecipes}
            disabled={ingredients.length === 0 || loadingRecipes}>
            {loadingRecipes ? "Generating recipes..." : "Generate recipes"}
          </button>
        </div>
      </div>
    );
  }

  function recipesScreen() {
    return (
      <div className="sb-subpage">
        {banner("Recipe ideas", "Use what's in your basket to make your next meal.", "Basket")}
        <div className="sb-list">
          {recipes ? (
            <article className="sb-content-card sb-recipe-markdown"><ReactMarkdown>{recipes}</ReactMarkdown></article>
          ) : (
            <article className="sb-content-card"><h2>No recipes generated yet</h2><p>Go to your basket to generate recipes.</p></article>
          )}
          <a className="sb-secondary" href="#Basket">Back to Basket</a>
        </div>
      </div>
    );
  }

  function historyScreen() {
    return (
      <div className="sb-subpage">
        {banner("Recipe History", "Revisit your previously generated recipes.", "History")}
        {historyStorageFailed && <p role="status">Browser storage is unavailable. New recipes may only be available until you close or refresh this tab.</p>}
        {recipeHistory.length ? (
          <div className="sb-list">
            {recipeHistory.map((entry) => (
              <details className="sb-content-card" key={entry.id}>
                <summary>{entry.ingredients.join(", ")} · <time dateTime={entry.createdAt}>{historyDate.format(new Date(entry.createdAt))}</time></summary>
                <div className="sb-recipe-markdown"><ReactMarkdown>{entry.text}</ReactMarkdown></div>
              </details>
            ))}
          </div>
        ) : (
          <article className="sb-content-card">
            <h2>No saved recipes yet</h2>
            <p>Recipes you generate will appear here.</p>
            <a className="sb-primary" href="#Basket">Go to your basket</a>
          </article>
        )}
      </div>
    );
  }

  return (
    <div className="sb-shell">
      <header className="sb-header">
        <a className="sb-brand" href="#Home">
          <img className="sb-logo" src="/SaveBite-logo.png" alt="SaveBite logo" />
          <span>SaveBite</span>
        </a>
        <nav className="sb-nav" aria-label="Main navigation">{primaryPages.map(navButton)}</nav>
      </header>
      <main className={`sb-view ${page === "Home" ? "sb-home-view" : ""}`}>
        {page === "Home" ? homeScreen() :
          page === "Upload Photo" ? uploadScreen() :
          page === "Type Ingredient" ? typeScreen() :
          page === "Basket" ? basketScreen() :
          page === "Recipe Results" ? recipesScreen() : historyScreen()}
      </main>
    </div>
  );
}
