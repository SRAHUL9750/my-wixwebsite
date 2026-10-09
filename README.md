# NTAS website

Static site for www.nextechalign.com, published with GitHub Pages (Settings → Pages → main / root). `CNAME` holds the domain.

## Enquiries
The contact form and every WhatsApp button save each enquiry to the "NTAS Website Enquiries" Google Sheet and opens WhatsApp (`WHATSAPP` in `script.js`).
The sheet receives rows through a Google Apps Script web app; its URL goes in `SHEET_URL` in `script.js`. The script:

```js
// NTAS website enquiries -> this Google Sheet.
// Paste into: Sheet -> Extensions -> Apps Script, replacing everything, then Deploy as a Web app.
// Columns: Received (IST) | Name | Mobile | Service | Message | Page | Status | Source
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.website) return out('ignored');                    // hidden field: bots only
    var source = d.source === 'WhatsApp button' ? 'WhatsApp button' : 'Website form';
    var name = clean(d.name, 80), mobile = String(d.mobile || '').trim();
    // A WhatsApp tile click has no name or number (the chat itself is in WhatsApp); a form entry needs both.
    if (source === 'Website form' && (!name || !/^[+0-9 ]{10,15}$/.test(mobile))) return out('invalid');
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Enquiries');
    if (sheet.getLastRow() > 20000) return out('full');
    sheet.appendRow([new Date(), name, mobile ? "'" + mobile : '', clean(d.service, 80), clean(d.message, 1000),
      clean(d.page, 200), 'New', source]);
    return out('ok');
  } catch (err) {
    return out('error');
  } finally {
    lock.releaseLock();
  }
}
// Trim, cut to length, and stop text being treated as a formula (=, +, -, @).
function clean(v, max) {
  v = String(v == null ? '' : v).trim().slice(0, max);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
function out(s) { return ContentService.createTextOutput(s); }
```
