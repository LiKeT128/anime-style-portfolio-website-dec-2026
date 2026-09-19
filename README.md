# Maksym Arikh — Portfolio

Personal site for early-stage teams and employers: business operations × AI-assisted building.
A live trading bot in production, cross-lingual LLM evaluation tooling, web apps, and six months in VÚB corporate banking.

## Features

- **Four languages** — English, Slovak, Russian, Ukrainian. English lives in `index.html`; `js/translations.js` overrides by `data-i18n` key and falls back to English for anything missing.
- **WebGL hero** — a domain-warped noise shader in the site palette, rendered at half resolution and paused when off-screen.
- **Live project visuals** — an animated price chart and terminal log for the trading bot, a cross-language consistency grid for the LLM eval, and a real screenshot of MatchMentor.
- **Motion** — scroll reveals, a scroll-driven experience timeline, count-up stats, magnetic buttons, 3D tilt, a text-scramble rotator.
- **Accessible defaults** — respects `prefers-reduced-motion`, works without JavaScript, keyboard focus styles, skip link.
- **No frameworks, no build step** — plain HTML, CSS and JavaScript.

## Structure

```
├── index.html               # All content (English)
├── css/style.css            # Design tokens, layout, animation, responsive rules
├── js/main.js               # i18n, shader, charts, scroll + pointer effects
├── js/translations.js       # SK / RU / UA strings
└── assets/
    ├── Maksym_Arikh_CV.pdf  # Downloadable CV
    ├── favicon.svg
    ├── og-image.jpg         # Link preview (1200×630)
    ├── video/               # About clip: one-shot intro + ping-pong loop + poster
    └── images/              # Project screenshots and artwork
```

## Run locally

It's a static site — open `index.html`, or serve the folder:

```bash
python -m http.server 5173
```

## Contact

- **Email**: [maxarikh@gmail.com](mailto:maxarikh@gmail.com)
- **LinkedIn**: [Maksym Arikh](https://www.linkedin.com/in/maksym-arikh-b15a2b369/)
- **GitHub**: [LiKeT128](https://github.com/LiKeT128)
