/* =============================================================================
 *  QR PHISHING AWARENESS DEMO  —  Cloudflare Worker (single file)
 *  Steer IT Solutions / Dragon Defence security-awareness talks.
 *
 *  Routes
 *    GET  /              -> "Free Venue Wi-Fi" lure
 *    POST /?api=submit   -> store email + device + geo, return capture
 *    GET  /?admin        -> password console (live list, QR, CSV, wipe)
 *    GET  /?api=list|export , POST /?api=clear  -> admin only
 *
 *  Needs a KV namespace bound as CAPTURES, and (recommended) a secret
 *  ADMIN_PASSWORD. See README for the 4-command deploy.
 * ========================================================================== */

const BRAND = 'Dragon Defence';
const ORG   = 'Steer IT Solutions';
const LURE  = 'Free Venue Wi-Fi';

const CSS = `
  :root{
    --bg:#eef2f6; --card:#ffffff; --ink:#0f172a; --muted:#64748b; --line:#e2e8f0;
    --brand:#2563eb; --brand-ink:#ffffff;
    --danger:#dc2626; --danger-2:#991b1b; --ok:#16a34a; --warn:#d97706;
    --radius:16px; --shadow:0 10px 40px rgba(15,23,42,.10);
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
    --sans:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:var(--sans);background:var(--bg);color:var(--ink);line-height:1.5;-webkit-font-smoothing:antialiased}
  a{color:var(--brand)}
  .wrap{max-width:460px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}

  /* ---------- LURE (captive portal) ---------- */
  .portal{min-height:100%;display:flex;flex-direction:column;justify-content:center;padding-block:40px}
  .signal{display:flex;align-items:center;gap:8px;justify-content:center;color:var(--muted);font-size:13px;margin-bottom:22px}
  .signal svg{width:18px;height:18px}
  .pcard{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}
  .pcard .top{background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;padding:30px 26px 26px;text-align:center}
  .wifi{width:54px;height:54px;margin:0 auto 12px;display:block}
  .pcard .top h1{margin:0;font-size:22px;font-weight:700;letter-spacing:-.01em}
  .pcard .top p{margin:6px 0 0;font-size:14px;opacity:.9}
  .pbody{padding:24px 26px 28px}
  .pbody label{display:block;font-size:13px;font-weight:600;color:var(--muted);margin:0 0 6px}
  .pbody input[type=email]{width:100%;padding:13px 14px;font-size:16px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;color:var(--ink);background:#fff}
  .pbody input[type=email]:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(37,99,235,.15)}
  .connect{margin-top:16px;width:100%;padding:14px;font-size:16px;font-weight:700;color:var(--brand-ink);background:var(--brand);border:none;border-radius:10px;cursor:pointer}
  .connect:active{transform:translateY(1px)}
  .fine{margin:16px 2px 0;font-size:11px;color:var(--muted);text-align:center;line-height:1.45}
  .brandline{margin-top:24px;text-align:center;font-size:11px;color:var(--muted)}

  /* ---------- GOTCHA reveal ---------- */
  .reveal{position:fixed;inset:0;z-index:50;background:linear-gradient(160deg,#1a0505,#450a0a 55%,#140303);color:#fff;overflow-y:auto;display:none;padding:calc(env(safe-area-inset-top,0px) + 34px) 0 48px}
  .reveal.on{display:block;animation:fade .35s ease}
  @keyframes fade{from{opacity:0}to{opacity:1}}
  @keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
  .gotcha-badge{width:84px;height:84px;margin:0 auto 18px;border-radius:50%;background:rgba(220,38,38,.18);border:2px solid #ef4444;display:flex;align-items:center;justify-content:center;animation:pop .5s ease both}
  .gotcha-badge svg{width:46px;height:46px}
  .reveal h1{font-size:40px;margin:0;text-align:center;font-weight:800;letter-spacing:-.02em;color:#fecaca}
  .reveal .sub{text-align:center;font-size:17px;margin:8px 0 26px;color:#fca5a5;font-weight:600}
  .panel{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:18px 18px 8px;margin-bottom:16px}
  .panel h2{margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#fecaca;font-weight:700}
  .panel .hint{margin:0 0 12px;font-size:13px;color:#e7cfcf}
  .cap{display:grid;grid-template-columns:auto 1fr;gap:8px 14px;font-size:14px}
  .cap dt{color:#f8b4b4;font-weight:600;white-space:nowrap}
  .cap dd{margin:0;font-family:var(--mono);font-size:13px;word-break:break-word;color:#fff}
  .tips{list-style:none;padding:0;margin:4px 0 0}
  .tips li{position:relative;padding:7px 0 7px 26px;font-size:14px;color:#f1e4e4;border-top:1px solid rgba(255,255,255,.08)}
  .tips li:first-child{border-top:none}
  .tips li::before{content:"";position:absolute;left:0;top:12px;width:14px;height:14px;border-radius:50%;background:#ef4444}
  .calm{font-size:13px;color:#e7cfcf;text-align:center;margin:18px 4px 0;line-height:1.5}
  .reveal .brandline{color:#d9a6a6;margin-top:22px}

  /* ---------- ADMIN ---------- */
  .adm{--bg:#0b1220;--card:#121a2b;--ink:#e6edf7;--muted:#8da2c0;--line:#223049}
  body.adm{background:var(--bg);color:var(--ink)}
  .adm .awrap{max-width:1040px;margin:0 auto;padding:calc(env(safe-area-inset-top,0px) + 20px) max(16px,env(safe-area-inset-left,0px)) 40px max(16px,env(safe-area-inset-right,0px))}
  .adm header.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px}
  .adm .logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;letter-spacing:-.01em}
  .adm .logo .dot{width:11px;height:11px;border-radius:50%;background:var(--danger);box-shadow:0 0 0 4px rgba(220,38,38,.2)}
  .adm .tag{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);border:1px solid var(--line);padding:3px 8px;border-radius:999px}
  .adm .ghost{background:transparent;border:1px solid var(--line);color:var(--muted);padding:7px 12px;border-radius:9px;font-size:13px;cursor:pointer;font-family:inherit}
  .adm .ghost:hover{color:var(--ink);border-color:#36507a}

  .grid{display:grid;grid-template-columns:320px 1fr;gap:18px;align-items:start}
  @media(max-width:760px){.grid{grid-template-columns:1fr}}
  .box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
  .box h3{margin:0 0 12px;font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted)}
  #qr{background:#fff;padding:14px;border-radius:12px;width:fit-content;margin:0 auto 12px;min-height:30px}
  #qr img,#qr canvas{display:block}
  .urlrow{display:flex;gap:6px;margin-top:4px}
  .urlrow input{flex:1;min-width:0;background:#0b1220;border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:9px 10px;font-size:13px;font-family:var(--mono)}
  .urlrow button{white-space:nowrap}
  .btn{background:var(--brand);color:#fff;border:none;border-radius:8px;padding:9px 13px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
  .btn.red{background:var(--danger)}
  .help{font-size:12px;color:var(--muted);margin:10px 0 0;line-height:1.5}

  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:10px;margin-bottom:16px}
  .stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
  .stat b{display:block;font-size:26px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
  .stat span{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin:-6px 0 16px}
  .chip{font-size:12px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:5px 11px;color:var(--muted)}
  .chip b{color:var(--ink)}

  .toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
  .toolbar .live{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--muted);margin-left:auto}
  .pulse{width:9px;height:9px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 0 rgba(22,163,74,.6);animation:pl 1.6s infinite}
  @keyframes pl{0%{box-shadow:0 0 0 0 rgba(22,163,74,.5)}70%{box-shadow:0 0 0 8px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}
  .tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:14px}
  table{border-collapse:collapse;width:100%;font-size:13px;min-width:720px}
  th,td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:#0e1726;position:sticky;top:0}
  tr:last-child td{border-bottom:none}
  td.email{font-weight:600}
  .pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:#1b2740;color:#bcd0f0;border:1px solid var(--line)}
  .pill.ios{background:#10233b;color:#8fd0ff}
  .pill.android{background:#13291a;color:#9ae6a7}
  .pill.windows{background:#1b1f3a;color:#b9b6ff}
  .pill.macos{background:#241b33;color:#e0b6ff}
  .ua{color:var(--muted);font-family:var(--mono);font-size:11px;max-width:260px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
  .ua.open{white-space:normal;overflow:visible}
  .empty{padding:48px 20px;text-align:center;color:var(--muted);font-size:14px}
  .confirm{display:inline-flex;gap:6px;align-items:center}

  /* ---------- login ---------- */
  .login{min-height:100%;display:flex;align-items:center;justify-content:center;padding:40px 0}
  .login .box{width:100%;max-width:340px}
  .login h3{margin-bottom:6px}
  .login p{font-size:13px;color:var(--muted);margin:0 0 16px}
  .login input{width:100%;padding:12px;border:1px solid var(--line);border-radius:9px;background:#0b1220;color:var(--ink);font-size:15px;font-family:inherit}
  .login .err{color:#fca5a5;font-size:13px;margin:10px 0 0}
  .login button{margin-top:14px;width:100%}
`;

function head(title){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
    + `<title>${title}</title><style>${CSS}</style></head>`;
}
function lurePage(){ return head(LURE) + `<body>
<div class="wrap">
  <div class="portal">
    <div class="signal">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12.55a11 11 0 0 1 14 0M8.5 16.1a6 6 0 0 1 7 0M2 8.82a15 15 0 0 1 20 0"/><line x1="12" y1="20" x2="12" y2="20"/></svg>
      <span>Not connected · Sign in to continue</span>
    </div>

    <div class="pcard">
      <div class="top">
        <svg class="wifi" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M5 12.55a11 11 0 0 1 14 0M8.5 16.1a6 6 0 0 1 7 0M2 8.82a15 15 0 0 1 20 0"/><circle cx="12" cy="20" r="1" fill="#fff" stroke="none"/></svg>
        <h1>${LURE}</h1>
        <p>Get online in seconds — it's on us</p>
      </div>
      <div class="pbody">
        <form id="f" novalidate>
          <label for="email">Enter your email to connect</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
          <button class="connect" type="submit">Connect to Wi-Fi</button>
        </form>
        <p class="fine">By connecting you agree to the acceptable use policy. Your session may be monitored for security and quality purposes.</p>
      </div>
    </div>
    <p class="brandline">Powered by GuestConnect&trade; · Secure Hotspot</p>
  </div>
</div>

<!-- ======================= GOTCHA REVEAL ======================= -->
<div class="reveal" id="reveal">
  <div class="wrap">
    <div class="gotcha-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.4" stroke-linecap="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
    </div>
    <h1>GOTCHA!</h1>
    <p class="sub">You just got phished.</p>

    <div class="panel">
      <h2>What just happened</h2>
      <p class="hint">You scanned an unknown QR code and handed your email to a page you'd never seen before. No company name, no verification — just a tempting offer. That's exactly how a real "quishing" attack starts.</p>
    </div>

    <div class="panel">
      <h2>What this page quietly captured</h2>
      <p class="hint">You only typed an email. Your device shared the rest automatically:</p>
      <dl class="cap" id="cap"></dl>
    </div>

    <div class="panel">
      <h2>In a real attack this could lead to</h2>
      <ul class="tips">
        <li>Your email added to targeted phishing and spam lists</li>
        <li>A fake login page harvesting your work password next</li>
        <li>Your device and location used to tailor the next lure</li>
      </ul>
    </div>

    <div class="panel">
      <h2>How to stay safe</h2>
      <ul class="tips">
        <li>Treat QR codes like links — don't scan ones you don't trust</li>
        <li>Check the web address before typing anything into it</li>
        <li>Never enter work credentials on a page reached via a QR code</li>
        <li>Real venue Wi-Fi rarely needs your email to connect</li>
      </ul>
    </div>

    <p class="calm">This was a controlled awareness exercise run by <strong>${ORG}</strong>. Nothing was sent anywhere — the details above are only shown to demonstrate the point, and will be deleted after the session.</p>
    <p class="brandline">${BRAND} · Security Awareness</p>
  </div>
</div>

<script>
(function(){
  var form = document.getElementById('f');
  var reveal = document.getElementById('reveal');

  function collect(){
    var nav = navigator;
    var plat = (nav.userAgentData && nav.userAgentData.platform) || nav.platform || '';
    var ua = nav.userAgent || '';
    var os = 'Unknown', browser = 'Unknown', device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'Mobile' : 'Desktop';
    if (/iPhone|iPad|iPod/i.test(ua)) os='iOS';
    else if (/Android/i.test(ua)) os='Android';
    else if (/Windows NT/i.test(ua)) os='Windows';
    else if (/Mac OS X|Macintosh/i.test(ua)) os='macOS';
    else if (/CrOS/i.test(ua)) os='ChromeOS';
    else if (/Linux/i.test(ua)) os='Linux';
    if (/Edg/i.test(ua)) browser='Edge';
    else if (/OPR|Opera/i.test(ua)) browser='Opera';
    else if (/SamsungBrowser/i.test(ua)) browser='Samsung Internet';
    else if (/Firefox|FxiOS/i.test(ua)) browser='Firefox';
    else if (/CriOS|Chrome/i.test(ua)) browser='Chrome';
    else if (/Safari/i.test(ua)) browser='Safari';
    var tz=''; try{ tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }catch(e){}
    return {
      os:os, browser:browser, device:device,
      screen: (screen.width||'?')+'x'+(screen.height||'?'),
      viewport: (window.innerWidth||'?')+'x'+(window.innerHeight||'?'),
      lang: nav.language || '',
      tz: tz,
      platform: plat,
      touch: ('ontouchstart' in window) || (nav.maxTouchPoints>0),
      referrer: document.referrer || ''
    };
  }

  function row(dl, k, v){
    if(!v && v!==0) return;
    var dt=document.createElement('dt'); dt.textContent=k;
    var dd=document.createElement('dd'); dd.textContent=v;
    dl.appendChild(dt); dl.appendChild(dd);
  }

  function showReveal(email, cap){
    var dl=document.getElementById('cap'); dl.textContent='';
    row(dl,'Email you entered', email);
    row(dl,'IP address', cap.ip);
    row(dl,'Approx. location', cap.geo);
    row(dl,'Operating system', cap.os);
    row(dl,'Browser', cap.browser);
    row(dl,'Device type', cap.device);
    row(dl,'Screen', cap.screen);
    row(dl,'Language', cap.lang);
    row(dl,'Time zone', cap.tz);
    row(dl,'Captured at', new Date().toLocaleString());
    reveal.classList.add('on');
    window.scrollTo(0,0);
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var email = (document.getElementById('email').value || '').trim();
    var client = collect();
    var btn = form.querySelector('.connect');
    btn.disabled = true; btn.textContent = 'Connecting…';

    fetch('?api=submit', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: email, client: client })
    }).then(function(r){ return r.json(); })
      .then(function(d){ showReveal(email, (d && d.captured) || client); })
      .catch(function(){ showReveal(email, client); });
  });
})();
</script>
</body></html>`; }
function loginPage(loginError){ return head('Awareness Console') + `<body class="adm">
  <div class="awrap">
    <div class="login">
      <form class="box" method="post">
        <h3>Awareness Console</h3>
        <p>Enter the admin password to view captured submissions.</p>
        <input type="password" name="password" placeholder="Password" autofocus>
        ${loginError ? `<div class="err">${loginError}</div>` : ''}
        <button class="btn" type="submit">Unlock</button>
      </form>
    </div>
  </div>
</body></html>`; }
function adminPage(){ return head('Awareness Console') + `<body class="adm"><div class="awrap">
    <header class="bar">
      <div class="logo"><span class="dot"></span>${BRAND} <span class="tag">Awareness Console</span></div>
      <a class="ghost" href="?admin&logout">Log out</a>
    </header>

    <div class="grid">
      <aside class="box">
        <h3>Your demo QR code</h3>
        <div id="qr"></div>
        <div class="urlrow">
          <input id="lureUrl" type="text" value="">
          <button class="btn" id="makeQr" type="button">Update</button>
        </div>
        <p class="help">Point your projector at this QR, or display the link. Audience phones that scan it land on the lure page. Set the public address of this page above if you're testing locally.</p>
        <div class="urlrow" style="margin-top:10px">
          <button class="btn ghost" id="copyUrl" type="button" style="flex:1">Copy link</button>
          <a class="btn ghost" href="?api=export" style="flex:1;text-align:center;text-decoration:none">Export CSV</a>
        </div>
        <div style="margin-top:10px">
          <span class="confirm" id="clearWrap">
            <button class="btn red" id="clearBtn" type="button">Clear all data</button>
          </span>
        </div>
        <p class="help">Wipe captures between sessions so no one's email lingers on the server.</p>
      </aside>

      <main>
        <div class="stats" id="stats"></div>
        <div class="chips" id="chips"></div>
        <div class="toolbar">
          <strong style="font-size:14px">Live captures</strong>
          <span class="live"><span class="pulse"></span> auto-refreshing</span>
        </div>
        <div class="tablewrap">
          <table>
            <thead><tr>
              <th>Time</th><th>Email</th><th>Device</th><th>OS</th><th>Browser</th><th>IP</th><th>Screen</th><th>Lang</th><th>Time zone</th><th>User agent</th>
            </tr></thead>
            <tbody id="rows"><tr><td colspan="10" class="empty">Waiting for the first scan…</td></tr></tbody>
          </table>
        </div>
      </main>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>
  <script>
  (function(){
    // -------- QR + link --------
    var base = location.origin + location.pathname;
    var urlInput = document.getElementById('lureUrl');
    urlInput.value = base;
    var qrBox = document.getElementById('qr');

    function makeQr(){
      qrBox.textContent='';
      var val = urlInput.value.trim() || base;
      try{
        var qr = qrcode(0, 'M');      // 0 = auto size, M = ~15% error correction
        qr.addData(val);
        qr.make();
        qrBox.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
        var svg = qrBox.querySelector('svg');
        if (svg){ svg.style.width='220px'; svg.style.height='220px'; }
      } catch(e){
        var p=document.createElement('div'); p.style.color='#333'; p.style.fontSize='12px';
        p.textContent='Could not render QR — share the link below instead.'; qrBox.appendChild(p);
      }
    }
    document.getElementById('makeQr').addEventListener('click', makeQr);
    makeQr();

    document.getElementById('copyUrl').addEventListener('click', function(){
      var self=this; var v=urlInput.value.trim();
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(v).then(function(){ self.textContent='Copied!'; setTimeout(function(){self.textContent='Copy link';},1400); })
        .catch(function(){ urlInput.select(); });
      } else { urlInput.select(); }
    });

    // -------- Clear (inline confirm) --------
    var clearWrap=document.getElementById('clearWrap');
    function resetClear(){
      clearWrap.textContent='';
      var b=document.createElement('button'); b.className='btn red'; b.textContent='Clear all data';
      b.addEventListener('click', askClear);
      clearWrap.appendChild(b);
    }
    function askClear(){
      clearWrap.textContent='';
      var q=document.createElement('span'); q.style.fontSize='13px'; q.style.color='#fca5a5'; q.textContent='Delete everything? ';
      var yes=document.createElement('button'); yes.className='btn red'; yes.textContent='Yes, wipe';
      var no=document.createElement('button'); no.className='btn ghost'; no.style.marginLeft='6px'; no.textContent='Cancel';
      clearWrap.appendChild(q); clearWrap.appendChild(yes); clearWrap.appendChild(no);
      no.addEventListener('click', resetClear);
      yes.addEventListener('click', function(){
        fetch('?api=clear',{method:'POST'}).then(function(){ resetClear(); load(); });
      });
    }
    document.getElementById('clearBtn').addEventListener('click', askClear);

    // -------- Table + stats --------
    function pill(os){
      var c=(os||'').toLowerCase();
      var cls = c.indexOf('ios')>=0?'ios':c.indexOf('android')>=0?'android':c.indexOf('windows')>=0?'windows':c.indexOf('mac')>=0?'macos':'';
      var span=document.createElement('span'); span.className='pill '+cls; span.textContent=os||'—'; return span;
    }
    function td(text){ var d=document.createElement('td'); d.textContent=text||'—'; return d; }

    function render(items){
      items = items.slice().reverse(); // newest first
      var tbody=document.getElementById('rows'); tbody.textContent='';
      if(!items.length){
        var tr=document.createElement('tr'); var cell=document.createElement('td');
        cell.colSpan=10; cell.className='empty'; cell.textContent='Waiting for the first scan…';
        tr.appendChild(cell); tbody.appendChild(tr);
      } else {
        items.forEach(function(r){
          var tr=document.createElement('tr');
          var t=''; try{ t=new Date(r.time).toLocaleTimeString(); }catch(e){ t=r.time||''; }
          tr.appendChild(td(t));
          var em=td(r.email); em.className='email'; tr.appendChild(em);
          tr.appendChild(td(r.device));
          var osd=document.createElement('td'); osd.appendChild(pill(r.os)); tr.appendChild(osd);
          tr.appendChild(td(r.browser));
          tr.appendChild(td(r.ip));
          tr.appendChild(td(r.screen));
          tr.appendChild(td(r.lang));
          tr.appendChild(td(r.tz));
          var u=document.createElement('td'); var sp=document.createElement('span'); sp.className='ua';
          sp.textContent=r.ua||'—'; sp.title='click to expand';
          sp.addEventListener('click', function(){ sp.classList.toggle('open'); });
          u.appendChild(sp); tr.appendChild(u);
          tbody.appendChild(tr);
        });
      }
      renderStats(items);
    }

    function renderStats(items){
      var total=items.length;
      var emails={}; var os={}; var br={};
      items.forEach(function(r){
        if(r.email) emails[r.email.toLowerCase()]=1;
        os[r.os||'Unknown']=(os[r.os||'Unknown']||0)+1;
        br[r.browser||'Unknown']=(br[r.browser||'Unknown']||0)+1;
      });
      var uniq=Object.keys(emails).length;
      var statsEl=document.getElementById('stats'); statsEl.textContent='';
      [['Captured',total],['Unique emails',uniq]].forEach(function(s){
        var d=document.createElement('div'); d.className='stat';
        var b=document.createElement('b'); b.textContent=s[1];
        var sp=document.createElement('span'); sp.textContent=s[0];
        d.appendChild(b); d.appendChild(sp); statsEl.appendChild(d);
      });
      var chips=document.getElementById('chips'); chips.textContent='';
      function addChips(obj){
        Object.keys(obj).sort(function(a,b){return obj[b]-obj[a];}).forEach(function(k){
          var c=document.createElement('span'); c.className='chip';
          var b=document.createElement('b'); b.textContent=obj[k];
          c.appendChild(b); c.appendChild(document.createTextNode(' '+k));
          chips.appendChild(c);
        });
      }
      addChips(os); addChips(br);
    }

    function load(){
      fetch('?api=list').then(function(r){ return r.json(); })
        .then(function(d){ if(d && d.items) render(d.items); })
        .catch(function(){});
    }
    load();
    setInterval(load, 3000);
  })();
  </script>
</body></html>`; }

function parseUa(ua){
  let os='Unknown', browser='Unknown', device=/Mobi|Android|iPhone|iPad|iPod/i.test(ua)?'Mobile':'Desktop';
  if(/iPhone|iPad|iPod/i.test(ua)) os='iOS';
  else if(/Android/i.test(ua)){ os='Android'; device=/Mobile/i.test(ua)?'Mobile':'Tablet'; }
  else if(/Windows NT/i.test(ua)) os='Windows';
  else if(/Mac OS X|Macintosh/i.test(ua)) os='macOS';
  else if(/CrOS/i.test(ua)) os='ChromeOS';
  else if(/Linux/i.test(ua)) os='Linux';
  if(/Edg/i.test(ua)) browser='Edge';
  else if(/OPR|Opera/i.test(ua)) browser='Opera';
  else if(/SamsungBrowser/i.test(ua)) browser='Samsung Internet';
  else if(/Firefox|FxiOS/i.test(ua)) browser='Firefox';
  else if(/CriOS|Chrome/i.test(ua)) browser='Chrome';
  else if(/Safari/i.test(ua)) browser='Safari';
  return {os, browser, device};
}

const s = v => (v==null?'':String(v));
const html = (b,st=200) => new Response(b,{status:st,headers:{'content-type':'text/html; charset=utf-8'}});
const json = (o,st=200) => new Response(JSON.stringify(o),{status:st,headers:{'content-type':'application/json'}});

async function readAll(kv){ try { return JSON.parse(await kv.get('captures') || '[]'); } catch(e){ return []; } }
async function append(kv, e){ const a = await readAll(kv); a.push(e); await kv.put('captures', JSON.stringify(a)); }

async function tokenFor(pwd){
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('qrdemo|'+pwd));
  return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function cookie(request,name){
  const m = (request.headers.get('cookie')||'').match(new RegExp('(?:^|; )'+name+'=([^;]+)'));
  return m ? m[1] : '';
}
async function authed(request,pwd){ return cookie(request,'qr_admin') === await tokenFor(pwd); }

function csvCell(v){ v = s(v).replace(/"/g,'""'); return `"${v}"`; }

export default {
  async fetch(request, env){
    const url = new URL(request.url);
    const api = url.searchParams.get('api');
    const isAdmin = url.searchParams.has('admin');
    const pwd = env.ADMIN_PASSWORD || 'steer-demo-2026';
    const kv = env.CAPTURES;

    if (!kv) return html('<pre style="padding:24px;font:14px system-ui">Setup needed: bind a KV namespace called CAPTURES. See the README.</pre>', 500);

    // ---- capture (open) ----
    if (api === 'submit' && request.method === 'POST'){
      const body = await request.json().catch(()=>({}));
      const client = (body && body.client) || {};
      const ua = request.headers.get('user-agent') || '';
      const srv = parseUa(ua);
      const cf = request.cf || {};
      const geo = [cf.city, cf.region, cf.country].filter(Boolean).join(', ');
      const entry = {
        id: crypto.randomUUID().slice(0,12),
        time: new Date().toISOString(),
        email: s(body.email).trim().slice(0,254),
        ip: request.headers.get('cf-connecting-ip') || '',
        geo: geo,
        ua: ua.slice(0,500),
        os: client.os || srv.os,
        browser: client.browser || srv.browser,
        device: client.device || srv.device,
        screen: s(client.screen).slice(0,40),
        viewport: s(client.viewport).slice(0,40),
        lang: s(client.lang || request.headers.get('accept-language') || '').slice(0,60),
        tz: s(client.tz).slice(0,60),
        platform: s(client.platform).slice(0,60),
        touch: !!client.touch
      };
      await append(kv, entry);
      return json({ ok:true, captured: entry });
    }

    // ---- admin-only APIs ----
    if (api === 'list'){
      if(!await authed(request,pwd)) return json({error:'forbidden'},403);
      return json({ items: await readAll(kv) });
    }
    if (api === 'clear' && request.method === 'POST'){
      if(!await authed(request,pwd)) return json({error:'forbidden'},403);
      await kv.put('captures','[]');
      return json({ ok:true });
    }
    if (api === 'export'){
      if(!await authed(request,pwd)) return new Response('forbidden',{status:403});
      const cols = ['time','email','ip','geo','os','browser','device','screen','viewport','lang','tz','platform','touch','ua'];
      const rows = await readAll(kv);
      const lines = [cols.join(',')];
      for(const r of rows){ lines.push(cols.map(c=> c==='touch' ? (r.touch?'yes':'no') : csvCell(r[c])).join(',')); }
      return new Response(lines.join('\n'), {headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="qr-demo-captures.csv"'}});
    }

    // ---- admin pages ----
    if (isAdmin){
      if (url.searchParams.has('logout')){
        return new Response(null,{status:302,headers:{'Location':'?admin','Set-Cookie':'qr_admin=; Path=/; Max-Age=0; SameSite=Lax'}});
      }
      if (request.method === 'POST'){
        const form = await request.formData();
        if (s(form.get('password')) === pwd){
          const tok = await tokenFor(pwd);
          return new Response(null,{status:302,headers:{'Location':'?admin','Set-Cookie':`qr_admin=${tok}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800`}});
        }
        return html(loginPage('Incorrect password.'));
      }
      if (await authed(request,pwd)) return html(adminPage());
      return html(loginPage(''));
    }

    // ---- lure ----
    return html(lurePage());
  }
};
