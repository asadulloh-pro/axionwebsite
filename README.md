# Axionlab Website

Modern multilingual marketing site for [axionlab.uz](https://axionlab.uz).

## Stack

- Astro 7 (SSG) + React islands
- Tailwind CSS 4
- Motion-ready interactive hero / forms
- i18n: Uzbek (default), English, Russian
- Vercel adapter + contact API → Telegram

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Environment

Copy `.env.example` and set:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Without these, the contact endpoint still returns success and logs the payload (useful for local UI testing).
