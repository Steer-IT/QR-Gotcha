# QR Phishing Awareness Demo

A live "quishing" (QR phishing) demonstration for security-awareness talks, built by
Steer IT Solutions / Dragon Defence.

Someone scans a QR code, lands on a tempting **"Free Venue Wi-Fi"** page, enters their
email to "connect" — and immediately gets a **GOTCHA** screen showing everything the page
silently captured (email, IP, approximate location, device, OS, browser, screen, language,
timezone). A password-protected **admin console** shows the whole room's captures live, with
a built-in QR generator, CSV export and a one-click wipe.

> **Use responsibly.** Only run this against people who are in the room for your talk. The
> reveal screen tells them right away it was a drill, and nothing is sent anywhere. Wipe the
> data with **Clear all** when you're done.

There are two ways to run it. Pick one.

---

## Option A — Cloudflare Worker (recommended for a live link)

Gives you a public `https://qr-phishing-demo.<your-subdomain>.workers.dev` URL with a real
backend, on Cloudflare's free tier. Deploys straight from this repo.

### Deploy from the command line (≈4 commands)

```bash
npm install
npx wrangler login                              # opens a browser to your Cloudflare account
npx wrangler kv namespace create CAPTURES       # copy the id it prints...
#   ...paste that id into wrangler.toml (replace PASTE_KV_ID_HERE)
npx wrangler secret put ADMIN_PASSWORD          # type the admin password you want
npx wrangler deploy
```

That's it — the final command prints your live URL.

### Or deploy from the Cloudflare dashboard (no CLI)

1. **Workers & Pages → Create → Worker**, give it a name, **Deploy** the starter.
2. **Edit code**, paste the contents of `src/worker.js`, **Deploy**.
3. **Settings → Variables → KV Namespace Bindings**: create a namespace, bind it with the
   variable name **`CAPTURES`**.
4. **Settings → Variables → Environment Variables**: add **`ADMIN_PASSWORD`** (encrypt it).
5. Open your Worker URL — you're live.

---

## Option B — PHP single file (self-host on your own domain)

If you'd rather drop it on your own cPanel/VPS hosting, `php/index.php` is a complete,
dependency-free version (the QR library is baked in, so it even works offline on a locked-down
venue network).

1. Edit `php/index.php` and change `'admin_password'` near the top.
2. Upload it as `index.php` to any PHP host, in a writable folder.
3. Open `yourdomain/?admin`.

---

## Running the demo during your talk

1. Open the admin console (`/?admin`) on your laptop and log in.
2. It shows a **QR code** — put it on the projector, or set the public URL box and display the
   link. (On Cloudflare, use your `*.workers.dev` address.)
3. Audience scans it, "connects", and sees the GOTCHA reveal on their own phone.
4. Flip to your admin screen — their emails and devices appear live as they submit.
5. Hit **Export CSV** if you want the list, then **Clear all** to wipe it afterwards.

## What gets captured

Email (typed) · IP address · approximate location (Cloudflare geo) · operating system ·
browser · device type · screen size · language · timezone · platform · raw user-agent.
The point of the talk: the visitor only typed an email — their device handed over the rest.

## Files

```
src/worker.js     Cloudflare Worker — the whole app (lure, gotcha, admin, API)
wrangler.toml     Worker + KV configuration
package.json      deploy scripts (wrangler)
php/index.php     self-host PHP version (alternative to the Worker)
```
