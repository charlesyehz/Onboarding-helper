# Repository Guidelines

## Project Structure & Module Organization
`manifest.json` wires the MV3 entry points and now points into the modular `src/` tree. `src/config/routes.js` centralises every onboarding path/persona definition, while `src/shared/` hosts cross-cutting helpers (DOM events, route utilities, storage, runtime messaging, tab lookup). `src/popup/` contains a small bootstrap plus feature-focused modules (`features/` and `ui/` folders), and `src/content/index.js` implements page-specific automation such as the register-phone autofill. `src/background/router.js` tracks tab URLs and broadcasts route updates. Keep assets under `images/`; extend the config file instead of sprinkling inline constants.

## Build, Test, and Development Commands
Load the extension locally via Chrome DevTools: visit `chrome://extensions`, enable Developer Mode, and choose **Load unpacked** pointing at the repository root. Run `npm run lint` (wraps `web-ext lint --source-dir .`) to catch manifest and permissions issues before review. Build a distributable archive with `npm run package`, which zips `manifest.json`, popup assets, images, `src/`, and `testlib.dom.umd.js` into `dist/onboarding-helper.zip`.

## Coding Style & Naming Conventions
Stick to 2-space indentation, `const`/`let` over `var`, and camelCase names that describe the workflow step (`initRoutePanel`, `injectPersonaFields`). Treat `src/config/routes.js` as the single source for onboarding personas—each fields array should remain an ordered list of `{ role, name, value }` objects so the popup can replay them verbatim through Testing Library. Shared helpers should expose obvious verbs (`matchRoute`, `bumpTicketCounter`) and avoid hidden globals. Prefer template literals for URLs or composed strings; otherwise default to double-quoted strings.

## Testing Guidelines
No automated suite exists yet, so exercise features manually on staging forms. After editing `src/content/index.js`, reload the extension and revisit `/register-phone` to confirm the observer fills `#phone` once. When changing `src/config/routes.js`, open the popup on every affected route, trigger each persona button, and watch the console for Testing Library errors. For the email/log-back-in helpers, generate a ticket-based address, confirm it persists in `Application > Storage`, and test both the signup autofill and the login mutation observer on an Auth0 screen.

## Commit & Pull Request Guidelines
This repository has no published commit history yet; establish a clear baseline using Conventional Commit prefixes (`feat:`, `fix:`, `docs:`) and write subjects in the imperative mood. Every pull request should link the relevant ticket, describe affected flows (content script, popup, assets), and attach a screenshot or screen recording showing the popup plus any target onboarding screen after autofill. Re-run `web-ext lint` before requesting review to keep reviewers focused on behavioral changes.

## Security & Configuration Tips
Never store real customer PII inside `src/config/routes.js`—use obvious synthetic data like the current placeholders. Keep long-lived secrets (API keys, internal URLs) out of the repository; inject them through Chrome storage or environment variables if that requirement emerges. The popup persists state in the extension’s localStorage, so scrub entries (chrome://settings/siteData → “Extension”) before sharing demos or recordings.
