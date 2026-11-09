# QR Phishing Awareness Demo (QR-Gotcha)

A live "quishing" (QR phishing) demonstration for security-awareness talks, built by
Steer IT Solutions / Dragon Defence.

Someone scans a QR code, lands on a tempting **"Free Venue Wi-Fi"** page, enters their email
to "connect" — and immediately gets a **GOTCHA** screen showing everything the page silently
captured (email, IP, approximate location, device, OS, browser, screen, language, timezone).
Every submission is **emailed straight to you**, so you just watch your inbox — no spreadsheet,
no admin login, nothing stored.

This version hosts on **GitHub Pages** (static site) with a tiny free **Google Apps Script**
that sends you the emails.

> **Use responsibly.** Only run this against people who are in the room for your talk. The
> reveal screen tells them right away it was a drill.

## How it fits together

```
GitHub Pages (static)            Google Apps Script (free)
┌────────────────────┐   POST    ┌───────────────────────────┐
│ index.html  (lure) │ ───────►  │ doPost → MailApp.sendEmail │ → your inbox
│ admin.html (QR)    │           └───────────────────────────┘
└────────────────────┘
```

## Setup

### 1. The collector (Google Apps Script) — ~2 minutes

1. Go to **script.google.com → New project**.
2. Delete the sample, paste in `apps-script/Code.gs`.
3. (Optional) set `NOTIFY_EMAIL` — leave it blank and it emails the Google account you deploy under.
4. **Deploy → New deployment → Web app**: *Execute as* **Me**, *Who has access* **Anyone**. Authorise it (it asks for permission to send email as you).
5. Copy the **Web app URL** (ends in `/exec`).

### 2. The pages

In **both** `index.html` and `admin.html`, set `SCRIPT_URL` to that `/exec` URL.
(`admin.html` only needs it so the "View lure page" link and QR point at the right place — the
QR works regardless.)

### 3. Publish on GitHub Pages

Repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/root` → Save.**
After a minute it's live at `https://steer-it.github.io/QR-Gotcha/`.

## Running the demo

1. Open **`admin.html`** (`…github.io/QR-Gotcha/admin.html`) — it shows the **QR code**. Put it on the projector or share the link.
2. Audience scan it, "connect", and get the GOTCHA reveal on their own phone.
3. Each submission lands in your inbox within a few seconds — open your mail to show the room the captures rolling in.

## What each email contains

Email entered · IP address · approximate location · device · OS · browser · screen · language ·
timezone · platform · raw user-agent. The IP and location come from a public lookup in the
visitor's own browser (`ipapi.co`, falling back to `ipify`); everything else the device reports
directly.

## Notes

- Consumer Gmail sends up to ~100 emails/day via Apps Script (Workspace ~1,500). Fine for a
  talk; if you expect a bigger crowd, say so and the script can batch into a single digest.
- Nothing is stored — no sheet, no database. When the talk's over, there's nothing to wipe.

## Alternative: self-hosted PHP

`php/index.php` is a complete, dependency-free version for your own cPanel/VPS hosting (it keeps
the built-in admin list rather than emailing). Change the admin password near the top, upload as
`index.php`, and open `yourdomain/?admin`.

## Files

```
index.html          lure + GOTCHA reveal (static)
admin.html          presenter page: your QR code + link (static)
apps-script/Code.gs  Google Apps Script that emails each capture to you
php/index.php        self-host PHP alternative (keeps an admin list instead of email)
```
