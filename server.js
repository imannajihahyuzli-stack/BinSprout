import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json());

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

app.post("/api/recipes", async (req, res) => {
  // Clean the list: max 15 items, short, letters and numbers only
  const raw = Array.isArray(req.body.ingredients) ? req.body.ingredients : [];
  const ingredients = raw
    .map((i) => String(i).slice(0, 40).replace(/[^\p{L}\p{N} \-]/gu, "").trim())
    .filter(Boolean)
    .slice(0, 15);

  if (ingredients.length === 0) {
    return res.status(400).json({ text: "Please add at least one ingredient." });
  }

  const prompt = `You are a food-waste reduction assistant for Malaysian students.
Ingredients available: ${ingredients.join(", ")}.

Reply in simple markdown with these sections:
## Recipes
Suggest 3 simple, low-cost recipes that use these ingredients (Malaysian-friendly where possible). For each: a short ingredient list and 3-4 short steps.
## Storage tips
One tip per ingredient to make it last longer.
## Why it matters
One sentence on why reducing food waste matters.

Finish with: "If food looks or smells spoiled, do not eat it."
Keep it concise.`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await r.json();

    if (!r.ok) {
      console.error("Gemini error:", JSON.stringify(data.error || data));
      return res.status(502).json({ text: "The AI could not answer right now. Please try again." });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || "").join("").trim();
    res.json({ text: text || "No answer came back. Please try again." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ text: "Something went wrong on the server." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`BinSprout server running on port ${PORT}`));