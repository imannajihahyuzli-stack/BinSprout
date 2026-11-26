# BinSprout 🌱

**Course:** SDT 2143 Artificial Intelligence in Modern Computing
**Assignment:** Mini AI Hackathon
**Theme:** AI for Social Good

## Team

| Name | Role |
|---|---|
| [Iman Najihah] | Developer |
| [Noor Shazlin Adriana] | Designer |
| [Syarifah Nur Syakirah] | Documentation |

## Introduction

BinSprout is a web app that helps students reduce food waste. Users take a photo of an ingredient, the app identifies it, and then suggests simple, low-cost recipes and storage tips so the food gets used before it spoils.

## Problem Statement

Food waste is a serious environmental and economic problem in Malaysia. When food ends up in landfills, it produces methane, a greenhouse gas, and it wastes money, which matters most to students on a tight budget. Many students throw away ingredients because they forget what they have, are unsure how to store them, or do not know what to cook with leftovers. [Add one sourced statistic about food waste in Malaysia here, with the link.]

## Objectives

1. To identify common ingredients from a photo using an image classification model.
2. To suggest simple, Malaysian-friendly recipes and storage tips using generative AI.
3. To raise awareness of food waste and encourage students to use what they already have.

## AI Tools Used

| Tool | Purpose |
|---|---|
| Teachable Machine | Train the ingredient image classifier |
| Hugging Face Hub | Host the trained model and the live website |
| Gemini API | Generate recipes, storage tips, and awareness messages |

## How It Works

1. The user uploads or takes a photo of an ingredient.
2. The image model identifies it, and the user can confirm or edit the result.
3. The ingredient list is sent to Gemini.
4. Gemini returns recipes, storage tips, and a short awareness message.

## Tech Stack

React (Vite), Express, Teachable Machine (TensorFlow.js), Hugging Face, Gemini API

## How to Run Locally

1. Install Node.js (LTS) and Git.
2. Clone the repo and install packages:
   npm install
3. Create a file named `.env` and add your own key (see `.env.example`):
   GEMINI_API_KEY=your_key_here
4. Start the app:
   npm run dev

## Project Links

- **Live demo:** https://save-bite-main.vercel.app
- **Model:** https://huggingface.co/pastelpinkyunicorn/binsprout-classifier
- **Demo video:** [add video link later]

## Disclaimer

BinSprout gives general suggestions only. If food looks or smells spoiled, do not eat it. When in doubt, throw it out.
