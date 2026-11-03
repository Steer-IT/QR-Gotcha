# QR Phishing Awareness Demo (QR-Gotcha)

A live "quishing" (QR phishing) demonstration for security-awareness talks, built by
Steer IT Solutions / Dragon Defence.

Someone scans a QR code, lands on a tempting **"Free Venue Wi-Fi"** page, enters their email
to "connect" — and immediately gets a **GOTCHA** screen showing everything the page silently
captured (email, IP, approximate location, device, OS, browser, screen, language, timezone).
A **admin console** shows the whole room's captures live, with a built-in QR generator, CSV
export and a one-click wipe.

This version is built to **host on GitHub Pages with no server** — the one moving part is a
free Google Apps Script that receives submissions into a Google Sheet.

> **Use responsibly.** Only run this against people who are in the room for your talk. The
> reveal screen tells them right away it was a drill. Wipe the sheet when you're done.

## How it fits together

```
GitHub Pages (static)              Google (free)
┌───────────────────┐   POST      ┌──────────────────────┐
│ index.html  (lure)│ ─────────►  │ Apps Script  → Sheet │
│ admin.html (console)│ ◄───────── │  (doPost / doGet)    │
└───────────────────┘   JSONP     └──────────────────────┘
```

## Setup

### 1. The collector (Google Apps Script) — ~2 minutes

1. Create a new **Google Sheet**.
2. **Extensions → Apps Script**, delete the sample, paste in `apps-script/Code.gs`.
3. Set **`ADMIN_KEY`** at the top to a secret of your choice.
4. **Deploy → New deployment → Web app**: *Execute as* **Me**, *Who has access* **Anyone**. Authorise it.
5. Copy the **Web app URL** (ends in `/exec`).

### 2. The pages

In **both** `index.html` and `admin.html`, set `SCRIPT_URL` to that `/exec` URL.
In `admin.html` also set `ADMIN_KEY` to the same secret you used in the script.

### 3. Publish on GitHub Pages

Repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/root` → Save.**
After a minute your site is live at `https://<user>.github.io/QR-Gotcha/`.

## Running the demo

1. Open **`admin.html`** on your laptop (`…github.io/QR-Gotcha/admin.html`).
2. It shows a **QR code** pointing at the lure — put it on the projector, or display the link.
3. Audience scan it, "connect", and get the GOTCHA reveal on their own phone.
4. Their emails and devices appear on your admin screen within a few seconds.
5. **Export CSV** for the list, then **Clear all data** to wipe the sheet afterwards.

## What gets captured

Email (typed) · IP address · approximate location · OS · browser · device type · screen size ·
language · timezone · platform · raw user-agent. The IP and location come from a public lookup
in the visitor's own browser (`ipapi.co`, falling back to `ipify`); everything else the device
reports directly. The teaching point: they only typed an email — the rest came for free.

## Security notes (worth saying out loud in the talk)

- `admin.html` holds the `ADMIN_KEY` in its source, so treat the admin URL as presenter-only.
  It gates the data against casual snooping, not a determined attacker — fine for a transient
  demo, and you wipe the sheet afterwards anyway.
- Nothing is collected beyond what people knowingly type, plus the standard signals any website
  receives. Delete the Apps Script deployment after the event if you want it fully gone.

## Alternative: self-hosted PHP

`php/index.php` is a complete, dependency-free version for your own cPanel/VPS hosting (the QR
library is baked in, so it works even offline). Change the admin password near the top, upload
as `index.php` to a writable folder, and open `yourdomain/?admin`.

## Files

```
index.html          lure + GOTCHA reveal (static)
admin.html          live console: QR generator, list, CSV, wipe (static)
apps-script/Code.gs  Google Apps Script collector (paste into script.google.com)
php/index.php        self-host PHP alternative (not needed for the GitHub Pages route)
```
