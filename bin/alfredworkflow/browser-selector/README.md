# Browser Selector

Portable Alfred workflow. Each Mac detects its own browsers and reads its own Alfred Web Search settings.

## First use

- `browser example.com`
- Choose browser.

First use generates direct, independently customizable keywords for browsers on that Mac. Afterwards, use browser names directly:

- `Safari example.com`
- `Firefox example.com`

Queries also follow Alfred-style behavior:

- `Safari macOS Tahoe` searches Google in Safari.
- `Safari yt macOS Tahoe` uses the enabled Alfred Web Search assigned to `yt`.
- Renamed and custom Alfred Web Search keywords work automatically. Disabled searches stay disabled.

Run `browser` without a query after installing or removing browsers. Detection refreshes keywords and Workflow Configuration fields. Apps absent from Alfred results—such as `ms-playwright/chromium-*`—stay excluded.
