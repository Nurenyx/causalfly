# CausalFly

Sprint 1 provides a deterministic CONTROL vs PERTURBED experiment on a small
synthetic directed network. This is an engineering fixture, **not a biological
model**; its results are not Drosophila findings. Sprint 2 adds Meta-powered
experiment design and structured interpretation around the unchanged engine,
with immutable measured evidence and an offline fake client.

## Experiment walking skeleton

Use Node.js 22 or newer (required by the OpenAI SDK). Install dependencies with
`npm ci`, then run:

```bash
npm test
npm run experiment:demo
npm run experiment:ai-demo
npm run lint
npm run build
git diff --check
```

The demo prints calculated peak activity, first threshold-crossing step, outcome,
matched-condition checks, and deltas (PERTURBED minus CONTROL), followed by the
complete structured JSON with per-step activity and provenance. The seed is
recorded for matching; the current engine has no randomness.

See [architecture](docs/ARCHITECTURE.md) for update and timing semantics and
[scientific constraints](docs/SCIENTIFIC-CONSTRAINTS.md) for interpretation limits.
See [Meta integration](docs/META-INTEGRATION.md) for `META_API_KEY`, `META_BASE_URL`,
`META_MODEL`, and live/fake mode details. The AI demo defaults to an explicitly
labeled **FAKE META CLIENT** when none of those variables are set. Force offline
mode with `npm run experiment:ai-demo -- --fake`, or require live mode with
`npm run experiment:ai-demo -- --live`. The CLI reads shell environment variables
and does not automatically load `.env` files. No dashboard integration is added.

The web app remains the Next.js starter described below.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
