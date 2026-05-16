# TrancheCalc — Exponential Position Sizer

> *"Buy more as it falls — with math, not emotion."*

A client-side position sizing calculator for retail traders who dollar-cost average (DCA) into assets across price tranches. Built for the itch scratched by this real-world complaint: *"Is there a calculator where I can enter total allocation and have it compute shares per tranche exponentially?"* — now there is.

---

## ✦ Features

- **Tranche calculator** — Enter total capital, number of levels, and entry price
- **Exponential / Linear / Equal curves** — Weight later tranches more heavily (buy more on deeper dips)
- **% drop or fixed $ drop** — Choose how price decreases between tranches
- **Live summary cards** — Total deployed, total shares, average cost basis, break-even
- **Allocation curve chart** — Bar + line combo showing $ and shares per tranche
- **Export CSV** — Download tranche table for spreadsheet use
- **Export PDF** — Professional printable report via jsPDF
- **Save/Load config** — Persists to localStorage, survives refreshes
- **Dark / Light mode** — Toggle with theme button
- **Mobile responsive** — Works on phone during market hours

---

## 🔗 Live Demo

> **[https://YOUR-USERNAME.github.io/tranche-allocator/](https://YOUR-USERNAME.github.io/tranche-allocator/)**  
> *(Fill in after deploying to GitHub Pages)*

---

## 🛠 Tech Stack

| Tool | Purpose |
|------|---------|
| Vanilla HTML/CSS/JS | Core app logic |
| [Chart.js 4](https://www.chartjs.org/) | Allocation curve visualization |
| [jsPDF](https://github.com/parallax/jsPDF) | PDF export |
| [jsPDF AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) | Table rendering in PDF |
| Google Fonts (Space Mono + Syne) | Typography |
| localStorage | Config persistence |

**No build step. No frameworks. No tracking. No server.**

---

## 🚀 Deployment (GitHub Pages)

```bash
# 1. Clone or init repo
git init tranche-allocator && cd tranche-allocator

# 2. Add all files (match project structure below)
# index.html, css/style.css, js/app.js, README.md

# 3. Push to GitHub
git add . && git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/tranche-allocator.git
git push -u origin main

# 4. Enable GitHub Pages
# Repo Settings → Pages → Source: main branch → / (root) → Save
```

---

## 📁 Project Structure

```
tranche-allocator/
├── index.html       # App shell
├── README.md        # This file
├── css/
│   └── style.css    # All styles (no Tailwind dependency)
└── js/
    └── app.js       # Calculation engine + UI logic
```

---

## 💡 How It Works

### Exponential Allocation

Each successive tranche (lower price) receives more capital than the previous one, scaled by the exponential factor:

```
weight[i] = factor^i
```

Then normalized so all weights sum to 1.0. This means:
- Tranche 1 (highest price) = smallest allocation
- Tranche 5 (lowest price) = largest allocation

With factor = 2 and 5 tranches:
```
Raw weights: 1, 2, 4, 8, 16 → normalized to: 3.2%, 6.5%, 12.9%, 25.8%, 51.6%
```

---

## 🧾 License

MIT — use freely, fork freely, build on it.

---

## 👤 Created by

**Chris Green**  
[X / Twitter →](https://x.com/chrisgreen)

---

*TrancheCalc is a calculation tool only. Nothing here is financial advice. Past price patterns don't predict future results.*
