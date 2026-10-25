# REA-assisted investigation runbook (Windows / PowerShell)

This is a workflow for comparing our independently implemented app with the public, authorized behaviour of Bodyswaps. Do not attempt to bypass access controls, automate sign-ups at scale, extract session credentials, or inspect another user's private content. The trial landing page may not expose any logged-in training interface.

## 1. Install and prepare REA

REA's current repository requires Node.js 22.x >= 22.23.4, 24.x >= 24.22.1, or 26.12.1+, plus npm. The environment that generated this starter had Node 22.16.0, which is below REA's documented Node 22 minimum; update Node before running REA.

Check installed versions:

```powershell
node -v
npm -v
```

Install the published CLI and configure only the agent you actually use. Setup previews changes and asks for approval.

```powershell
npm install --global rea-agents
rea --help
rea setup --client codex --dry-run --json
rea setup --client codex
rea doctor --json
```

Replace `codex` with a supported client ID if needed. Restart that agent after setup. To check the precise syntax exposed by your installed release, use `rea <command> --help`.

## 2. Open a dedicated browser profile

Close the profile before finishing. Use a separate temporary profile and bind remote debugging to loopback only. If Chrome is installed in a different location, update `$chrome`.

```powershell
$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { throw "Set `$chrome to your Chrome executable path." }
Start-Process -FilePath $chrome -ArgumentList @(
  "--remote-debugging-port=9222",
  "--user-data-dir=C:\rea-bodyswaps-profile",
  "https://bodyswaps.co/trial?hsCtaAttrib=208610158104"
)
```

Do not forward port 9222 or expose it on a LAN. Manually navigate only through public or trial areas you are authorized to view.

## 3. Discover and inspect the page

First use the current CLI help to verify the exact argument order for the installed release:

```powershell
rea list-browser-targets --help
rea inspect-web-page --help
rea observe-web-session --help
rea analyze-web-bundle --help
```

The corresponding REA surfaces are `list-browser-targets`, `inspect-web-page`, `observe-web-session`, `analyze-web-bundle`, `capture-web-screenshot`, and `compare-web-captures`. Their purpose and limits are documented in the official `docs/browser-observation.md` file in `morluto/rea`.

Where the installed command help confirms the syntax, discovery typically uses the CDP endpoint plus a narrow origin filter, for example:

```powershell
rea list-browser-targets http://127.0.0.1:9222 --allowed-origins https://bodyswaps.co --json
```

Copy the actual page target ID from that output. Use the exact command help to construct the inspection command for your installed release; save the result into `C:\rea-evidence\captures`. REA command schemas change over time, so don't copy target IDs from old captures or assume a field was fully observed just because it is absent from a partial result.

## 4. Evidence checklist

For each screen or flow, record:

- URL/origin and the authorized access level (public or trial account you control).
- Page heading, accessible labels, forms, visible buttons and validation messages.
- User action performed and visible result.
- Any redirect, reload, failure or route change observed.
- Whether the evidence is direct, inferred or unknown.
- A screenshot or sanitized JSON capture path, when permitted.

Priority routes: trial landing, signup form, validation/error state, confirmation/redirect, and (only if authorized) learner dashboard, scenario, conversation, report, trainer scenario builder and analytics.

## 5. Compare our app

Run the Morrow app locally, launch a second isolated browser profile on port 9223, and inspect our own UI. Compare the captures with the feature checklist; don't claim equivalence if either capture is partial. For functional behaviour, use Playwright tests in addition to passive REA inspection.

## Data hygiene

Before sharing captures, review and redact email addresses, organization IDs, user-generated content, cookies, tokens, local storage values and any other sensitive data. Do not capture or export private learner records. Never treat a candidate endpoint or a script string as permission to call a service.
