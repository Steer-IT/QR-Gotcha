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
GitHub Pages (static)          Web3Forms (free email relay)
┌────────────────────┐   POST   ┌──────────────────────────┐
│ index.html  (lure) │ ──────►  │ api.web3forms.com/submit │ → your inbox
│ admin.html (QR)    │          └──────────────────────────┘
└────────────────────┘
```

GitHub itself can't send the email (a static site has no server, and putting a token in the
public page to make GitHub do it would be insecure and auto-revoked). So the page posts straight
to a lightweight email relay. The default is **Web3Forms** — no Google, no account to manage.

## Setup

### 1. Get an email key (Web3Forms) — ~1 minute, no Google

1. Go to **web3forms.com**, enter the email address you want the captures sent to, and submit.
2. The **access key** arrives in that inbox.
3. Open `index.html` and paste it into `WEB3FORMS_KEY`. That's the only edit.

That's it — every submission is now emailed to you. (The access key is meant to live in the
page; the worst anyone can do with it is send spam to that inbox, and you can rotate it.)

*Prefer Google?* Instead of a Web3Forms key, deploy `apps-script/Code.gs` (script.google.com →
paste → Deploy as Web app, *Execute as Me* / *Anyone*), and put its `/exec` URL in `SCRIPT_URL`
in `index.html`, leaving `WEB3FORMS_KEY` blank.

### 2. Publish on GitHub Pages

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

- Web3Forms' free tier covers ~250 submissions/month — plenty for a talk. (If you use the Apps
  Script route instead, consumer Gmail allows ~100 emails/day, Workspace ~1,500.)
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
