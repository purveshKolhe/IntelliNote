# 🚀 IntelliNote — Local-First Collaborative Workspace

<p align="center">
  <img src="./logo.webp" alt="IntelliNote Logo" width="120" style="border-radius: 28px; box-shadow: 0 12px 36px rgba(126, 108, 240, 0.25);" />
</p>

<h3 align="center">A premium, offline-first personal workspace combining Notion-like block documents, built-in canvas whiteboards, Groq-powered AI, and an integrated Pomodoro & Habit-tracking dashboard.</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20Vite-6272a4?style=for-the-badge&logo=javascript" alt="Stack" />
  <img src="https://img.shields.io/badge/Database-IndexedDB%20(idb--keyval)-blueviolet?style=for-the-badge" alt="Database" />
  <img src="https://img.shields.io/badge/AI-Groq%20API-orange?style=for-the-badge&logo=openai" alt="Groq AI" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

---

## 🌟 Pitch & Overview

**IntelliNote** was built for the next generation of students, builders, and professionals who need a central dashboard that unifies **knowledge** and **action**. Traditional note-taking tools are slow, require internet connections, and separate your documentation from your focus tools (timers, tasks, habits). 

IntelliNote solves this by placing everything in a high-fidelity, local-first Single Page Application (SPA). Your data never leaves your device unless you explicitly export it.

---

## 🛠️ Tech Stack & Architecture

- **Bundler & Core**: [Vite](https://vite.dev/) & Vanilla JavaScript for blazing-fast load times.
- **Styling**: Modular Vanilla CSS with CSS custom properties, HSL color tokens, glassmorphism, responsive grid systems, and custom keyframe micro-animations.
- **Storage (Local-First)**: Powered by **IndexedDB** (via `idb-keyval` abstraction) and `localStorage`. High performance with zero server lag.
- **AI Engine**: Direct client-to-API integration with **Groq Cloud API** for ultra-fast LLM responses (using models like Llama 3/4 and Qwen).
- **Formula Rendering**: [KaTeX](https://katex.org/) for rendering heavy math LaTeX scripts.
- **Audio synthesis**: Built-in **Web Audio API** oscillator engine to synthesize focusing chimes locally (no heavy MP3 static assets).

---

## ✨ Key Features

### 1. Advanced Block-based Document Editor
A highly intuitive editor built from scratch on top of modern `contenteditable` capabilities:
* **Rich Block Types**: Headings (H1/H2/H3), paragraph text, lists (numbered, bulleted, checkable), horizontal dividers, blockquotes, code blocks (with live syntax highlighting), and callout blocks with customizable emoji headers.
* **Inline Markdown Commands**: Write notes using `/` command menus or typical markdown shortcuts (e.g. typing `# ` transforms the block to a Heading 1).
* **KaTeX LaTeX Equations**: Support for inline math `\( ... \)` and full block equations `$$ ... $$` rendered natively.
* **Editable Tables**: Create and populate dynamic data tables directly inside pages with live row and column adjustments.

### 2. Interactive Block Widgets (Plugins)
* **🎨 Sketch Whiteboard Widget**: A canvas whiteboard embedded right in your notes. Features pen types (Brush, Pencil, Fountain Pen), geometry shapes (Circles, Rectangles, Lines), customizable opacity, thickness, and color selectors. Auto-saves canvas state as base64 strings directly in IndexedDB.
* **📺 YouTube Embed Widget**: Paste a YouTube link and watch videos inline. Perfect for organizing lecture notes and tutorials side-by-side with video content.

### 3. Integrated Pomodoro Focus Engine
An upgraded productivity center accessible instantly from the main navigation sidebar:
* **Adaptive Interval Engine**: Set customizable timer periods for Focus, Short Breaks, and Long Breaks.
* **Web Audio Synthesis**: Renders custom sound notifications and countdown chimes natively in the browser.
* **Target Quota System**: Define daily Pomodoro goals, tracking how many focus cycles you complete compared to your targets.
* **Desktop Notifications**: Pushes native OS system alerts when focus sessions complete or break cycles begin.

### 4. Advanced Task & Habit Trackers
* **Hierarchical Task Trees**: Nest unlimited sub-tasks underneath parent tasks to break down complex projects.
* **Cumulative Time Logging**: Tracks how many minutes/hours of Pomodoro focus you've put into each specific task.
* **Habit Streaks**: Positive vs. negative habit tracker with checkbox history over the last 7 days, automatically calculating current streaks, best streaks, and overall consistency index.

### 5. Deep AI Assistant Integration (Groq)
* **Note Contextual Chat**: The AI assistant scans the content of your current page to answer questions, explain concepts, or translate content.
* **🧠 Smart Edit Protocol**: The AI can write back edits. Ask the AI: *"Restructure this note as a checklist"* or *"Add a table of contents and a code block in Javascript"*, and it will generate a secure `[NOTE_EDIT_ACTION]` payload to rebuild the document blocks automatically.
* **Persistent Chat Threads**: Save your chat session history directly into the note as a block widget to review your conversation later.

---

## 🚀 Setup & Installation

Follow these quick steps to get IntelliNote running on your machine:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 18+ recommended).

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/intellinote.git
cd intellinote
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```
This launches the application on [http://localhost:5173](http://localhost:5173). Open it in your web browser.

### 4. Build for Production
To build a highly optimized bundle that can be statically hosted anywhere (Vercel, Netlify, GitHub Pages):
```bash
npm run build
```
The production bundle will be generated in the `dist/` directory.

---

## ⚙️ Configuration & Groq AI Setup

Since IntelliNote is **local-first**, you bring your own AI key:
1. Open IntelliNote in your browser.
2. Go to **Plugins** or **Settings** (gear icon) in the bottom-left.
3. Enter your **Groq API Key** (you can generate one for free on the [Groq Console](https://console.groq.com/)).
4. Select your preferred LLM model (e.g. `llama3-8b-8192` or `llama-3.1-70b-versatile`).
5. Start chatting or autocompleting notes!

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
