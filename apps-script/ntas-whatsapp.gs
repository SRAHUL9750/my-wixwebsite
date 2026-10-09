// NTAS website enquiries + WhatsApp (Meta Cloud API) for this Google Sheet.
//
//  - Website form and WhatsApp buttons add rows to "Enquiries".
//  - Each new enquiry can get an automatic WhatsApp welcome template (WhatsApp menu > Settings).
//  - WhatsApp menu > Send campaign: sends an approved template to everyone who ticked the opt-in box.
//  - Messages people send to your WhatsApp number are logged in "Incoming" (needs the Meta webhook).
//  - Anyone who replies STOP is marked as opted out and never gets campaigns again.
//
// Your access token is kept in this script's private settings (Script Properties), never in the code
// or the website. Only the sheet owner can see or change it.

var GRAPH = 'https://graph.facebook.com/';
var ENQ = 'Enquiries', INCOMING = 'Incoming', CAMPAIGNS = 'Campaigns';
// Enquiries columns
var C = { time: 1, name: 2, mobile: 3, service: 4, message: 5, page: 6, status: 7, source: 8, optIn: 9, welcome: 10 };

// ---------- settings ----------
var SETTINGS = [
  ['WA_TOKEN', 'Access token (permanent System User token from Meta Business settings)', true],
  ['WA_PHONE_ID', 'Phone number ID (WhatsApp Manager > API setup), digits only', false],
  ['WA_API_VERSION', 'Graph API version, e.g. v23.0', false],
  ['WELCOME_TEMPLATE', 'Welcome template name for new enquiries (leave empty to switch auto-welcome off)', false],
  ['WELCOME_LANG', 'Welcome template language code, e.g. en or en_US', false],
  ['WELCOME_PARAMS', 'Welcome template variables in order: name,service  |  name  |  none', false],
  ['WELCOME_DAILY_MAX', 'Most welcome messages per day (protects your bill from spam), e.g. 100', false],
  ['WA_VERIFY_TOKEN', 'Webhook verify token: any secret word you also type in Meta webhook settings', true]
];
var DEFAULTS = { WA_API_VERSION: 'v23.0', WELCOME_LANG: 'en', WELCOME_PARAMS: 'name,service', WELCOME_DAILY_MAX: '100' };

function prop(k) { var v = PropertiesService.getScriptProperties().getProperty(k); return v == null || v === '' ? (DEFAULTS[k] || '') : v; }

function onOpen() {
  SpreadsheetApp.getUi().createMenu('WhatsApp')
    .addItem('Settings…', 'menuSettings')
    .addItem('Check settings', 'menuCheck')
    .addItem('Send test welcome to a number…', 'menuTestWelcome')
    .addSeparator()
    .addItem('Send campaign to opted-in contacts…', 'menuCampaign')
    .addToUi();
}

function menuSettings() {
  var ui = SpreadsheetApp.getUi(), p = PropertiesService.getScriptProperties();
  for (var i = 0; i < SETTINGS.length; i++) {
    var key = SETTINGS[i][0], label = SETTINGS[i][1], secret = SETTINGS[i][2];
    var cur = p.getProperty(key);
    var shown = cur ? (secret ? '(saved, hidden)' : cur) : (DEFAULTS[key] ? DEFAULTS[key] + ' (default)' : '(empty)');
    var r = ui.prompt('WhatsApp settings ' + (i + 1) + '/' + SETTINGS.length,
      label + '\n\nNow: ' + shown + '\nType a new value, or leave blank to keep it. Type - to clear it.', ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return;
    var v = r.getResponseText().trim();
    if (v === '-') p.deleteProperty(key); else if (v) p.setProperty(key, v);
  }
  ensureSheets();
  ui.alert('Saved. Use "Check settings" to test the connection.');
}

function menuCheck() {
  var ui = SpreadsheetApp.getUi();
  if (!prop('WA_TOKEN') || !prop('WA_PHONE_ID')) { ui.alert('Add the access token and phone number ID in Settings first.'); return; }
  var r = UrlFetchApp.fetch(GRAPH + prop('WA_API_VERSION') + '/' + prop('WA_PHONE_ID') + '?fields=display_phone_number,verified_name,quality_rating',
    { headers: { Authorization: 'Bearer ' + prop('WA_TOKEN') }, muteHttpExceptions: true });
  var j = safeJson(r.getContentText());
  if (r.getResponseCode() === 200) ui.alert('Connected ✅\n\nNumber: ' + j.display_phone_number + '\nName: ' + j.verified_name + '\nQuality: ' + j.quality_rating +
    '\nAuto-welcome: ' + (prop('WELCOME_TEMPLATE') ? prop('WELCOME_TEMPLATE') + ' (' + prop('WELCOME_PARAMS') + ')' : 'off') +
    '\nWebhook verify token: ' + (prop('WA_VERIFY_TOKEN') ? 'set' : 'NOT set'));
  else ui.alert('Not connected ❌\n\n' + errText(j, r));
}

function menuTestWelcome() {
  var ui = SpreadsheetApp.getUi();
  if (!prop('WELCOME_TEMPLATE')) { ui.alert('Set the welcome template name in Settings first.'); return; }
  var r = ui.prompt('Send test welcome', 'Mobile number to send to (e.g. 9876543210):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var res = sendTemplate(r.getResponseText(), prop('WELCOME_TEMPLATE'), prop('WELCOME_LANG'), welcomeParams('Test', 'General enquiry'));
  ui.alert(res.ok ? 'Sent ✅ (' + res.id + ')' : 'Failed ❌\n\n' + res.error);
}

// ---------- website enquiries + Meta webhook ----------
function doGet(e) {
  var q = (e && e.parameter) || {};
  // Meta webhook verification
  if (q['hub.mode'] === 'subscribe') {
    var ok = prop('WA_VERIFY_TOKEN') && q['hub.verify_token'] === prop('WA_VERIFY_TOKEN');
    return ContentService.createTextOutput(ok ? q['hub.challenge'] : 'forbidden');
  }
  return out('ok');
}

function doPost(e) {
  var raw = (e && e.postData && e.postData.contents) || '{}';
  var d = safeJson(raw);
  if (d.object === 'whatsapp_business_account') return handleWebhook(d);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (d.website) return out('ignored');                    // hidden field: bots only
    var source = d.source === 'WhatsApp button' ? 'WhatsApp button' : 'Website form';
    var name = clean(d.name, 80), mobile = String(d.mobile || '').trim();
    var mobileOk = /^[+0-9 ]{10,15}$/.test(mobile);
    if (source === 'Website form' && (!name || !mobileOk)) return out('invalid');
    if (mobile && !mobileOk) mobile = '';
    var sheet = ensureSheets().enq;
    if (sheet.getLastRow() > 20000) return out('full');
    var service = clean(d.service, 80);
    sheet.appendRow([new Date(), name, mobile ? "'" + mobile : '', service, clean(d.message, 1000),
      clean(d.page, 200), 'New', source, d.optIn === 'Yes' ? 'Yes' : 'No', '']);
    var row = sheet.getLastRow();
    if (mobile) sheet.getRange(row, C.welcome).setValue(autoWelcome(mobile, name, service));
    return out('ok');
  } catch (err) {
    return out('error');
  } finally {
    lock.releaseLock();
  }
}

// Sends the welcome template at most once per number every 6 h, within the daily cap. Returns the text for the "Welcome sent" column.
function autoWelcome(mobile, name, service) {
  var tpl = prop('WELCOME_TEMPLATE');
  if (!tpl || !prop('WA_TOKEN') || !prop('WA_PHONE_ID')) return '';
  var to = normalize(mobile);
  if (!to) return 'Skipped: bad number';
  if (isOptedOut(to)) return 'Skipped: opted out';
  var cache = CacheService.getScriptCache();
  if (cache.get('w_' + to)) return 'Skipped: welcomed in the last 6 h';
  var p = PropertiesService.getScriptProperties(), dayKey = 'welcome_' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd');
  var count = +(p.getProperty(dayKey) || 0);
  if (count >= +prop('WELCOME_DAILY_MAX')) return 'Skipped: daily limit reached';
  var res = sendTemplate(to, tpl, prop('WELCOME_LANG'), welcomeParams(name, service));
  if (res.ok) { cache.put('w_' + to, '1', 21600) /* 6 h, the cache maximum */; p.setProperty(dayKey, String(count + 1)); return 'Sent ' + fmtNow(); }
  return 'Failed: ' + res.error.slice(0, 180);
}

function welcomeParams(name, service) {
  var want = String(prop('WELCOME_PARAMS')).toLowerCase().replace(/\s/g, '');
  if (!want || want === 'none') return [];
  return want.split(',').map(function (k) { return k === 'service' ? (service || 'our IT services') : (name || 'there'); });
}

// ---------- incoming messages (Meta webhook) ----------
function handleWebhook(d) {
  try {
    var sh = ensureSheets(), cache = CacheService.getScriptCache();
    (d.entry || []).forEach(function (en) {
      (en.changes || []).forEach(function (ch) {
        var v = ch.value || {};
        if (v.metadata && prop('WA_PHONE_ID') && String(v.metadata.phone_number_id) !== String(prop('WA_PHONE_ID'))) return;
        var names = {};
        (v.contacts || []).forEach(function (c) { names[c.wa_id] = c.profile && c.profile.name; });
        (v.messages || []).forEach(function (m) {
          if (!m.id || cache.get('m_' + m.id)) return;           // Meta may deliver the same message twice
          cache.put('m_' + m.id, '1', 21600);
          var text = m.text ? m.text.body : m.button ? m.button.text : m.interactive ? JSON.stringify(m.interactive).slice(0, 200) : '[' + m.type + ']';
          sh.incoming.appendRow([new Date(+m.timestamp * 1000 || Date.now()), "'+" + m.from, clean(names[m.from], 80), clean(text, 1000), m.type, m.id]);
          if (/^\s*(stop|unsubscribe)\s*$/i.test(text || '')) markOptOut(m.from);
        });
      });
    });
  } catch (err) { /* never fail the webhook */ }
  return out('ok');
}

function markOptOut(waId) {
  var to = normalize(waId), p = PropertiesService.getScriptProperties();
  var list = safeJson(p.getProperty('OPTED_OUT') || '[]'); if (!Array.isArray(list)) list = [];
  if (list.indexOf(to) < 0) { list.push(to); p.setProperty('OPTED_OUT', JSON.stringify(list)); }
  var enq = ensureSheets().enq, n = enq.getLastRow() - 1;
  if (n < 1) return;
  var mob = enq.getRange(2, C.mobile, n, 1).getValues();
  for (var i = 0; i < n; i++) if (normalize(mob[i][0]) === to) enq.getRange(i + 2, C.optIn).setValue('No (STOP)');
}
function isOptedOut(to) {
  var list = safeJson(PropertiesService.getScriptProperties().getProperty('OPTED_OUT') || '[]');
  return Array.isArray(list) && list.indexOf(to) >= 0;
}

// ---------- campaigns ----------
function menuCampaign() {
  var ui = SpreadsheetApp.getUi();
  if (!prop('WA_TOKEN') || !prop('WA_PHONE_ID')) { ui.alert('Add the access token and phone number ID in Settings first.'); return; }
  var t = ui.prompt('Send campaign', 'Approved MARKETING template name (exactly as in WhatsApp Manager):', ui.ButtonSet.OK_CANCEL);
  if (t.getSelectedButton() !== ui.Button.OK || !t.getResponseText().trim()) return;
  var tpl = t.getResponseText().trim();
  var l = ui.prompt('Template language', 'Language code (blank = en):', ui.ButtonSet.OK_CANCEL);
  if (l.getSelectedButton() !== ui.Button.OK) return;
  var lang = l.getResponseText().trim() || 'en';
  var v = ui.prompt('Template variables', 'Does the template body have {{1}} for the customer name? Type yes or no:', ui.ButtonSet.OK_CANCEL);
  if (v.getSelectedButton() !== ui.Button.OK) return;
  var useName = /^y/i.test(v.getResponseText().trim());

  var sh = ensureSheets();
  var already = {};
  if (sh.camp.getLastRow() > 1) sh.camp.getRange(2, 1, sh.camp.getLastRow() - 1, 5).getValues()
    .forEach(function (r) { if (r[1] === tpl && /^Sent/.test(r[4])) already[normalize(r[2])] = 1; });
  var people = {}, n = sh.enq.getLastRow() - 1;
  if (n > 0) sh.enq.getRange(2, 1, n, C.welcome).getValues().forEach(function (r) {
    var to = normalize(r[C.mobile - 1]);
    if (!to) return;
    if (String(r[C.optIn - 1]).indexOf('No (STOP)') === 0) { people[to] = null; return; }
    if (r[C.optIn - 1] === 'Yes' && people[to] !== null) people[to] = r[C.name - 1] || people[to] || '';
  });
  var list = Object.keys(people).filter(function (k) { return people[k] !== null && !already[k] && !isOptedOut(k); });
  if (!list.length) { ui.alert('Nobody left to send "' + tpl + '" to. Only contacts who ticked the WhatsApp opt-in box are included, and each gets a template once.'); return; }
  var ok = ui.alert('Send campaign', 'Send template "' + tpl + '" (' + lang + ') to ' + list.length + ' opted-in contact(s)?\n\nMeta charges each marketing message to your WhatsApp account.', ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  var start = Date.now(), sent = 0, failed = 0, done = 0;
  for (var i = 0; i < list.length; i++) {
    if (Date.now() - start > 300000) break;                   // stay inside Apps Script's 6-minute limit
    var to = list[i], res = sendTemplate(to, tpl, lang, useName ? [people[to] || 'there'] : []);
    sh.camp.appendRow([new Date(), tpl, "'+" + to, people[to] || '', res.ok ? 'Sent' : 'Failed', res.ok ? res.id : res.error.slice(0, 300)]);
    res.ok ? sent++ : failed++; done++;
    Utilities.sleep(120);
  }
  ui.alert('Campaign "' + tpl + '"\n\nSent: ' + sent + '\nFailed: ' + failed + (done < list.length ? '\nNot yet sent: ' + (list.length - done) + ' (run it again to continue)' : '') + '\n\nDetails are in the "Campaigns" tab.');
}

// ---------- helpers ----------
function sendTemplate(mobile, name, lang, params) {
  var to = normalize(mobile);
  if (!to) return { ok: false, error: 'bad number' };
  var tpl = { name: name, language: { code: lang || 'en' } };
  if (params && params.length) tpl.components = [{ type: 'body', parameters: params.map(function (x) { return { type: 'text', text: String(x).slice(0, 60) }; }) }];
  var r = UrlFetchApp.fetch(GRAPH + prop('WA_API_VERSION') + '/' + prop('WA_PHONE_ID') + '/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + prop('WA_TOKEN') },
    payload: JSON.stringify({ messaging_product: 'whatsapp', to: to, type: 'template', template: tpl })
  });
  var j = safeJson(r.getContentText());
  if (r.getResponseCode() === 200 && j.messages && j.messages[0]) return { ok: true, id: j.messages[0].id };
  return { ok: false, error: errText(j, r) };
}

// 9876543210 / +91 98765 43210 / 09876543210 -> 919876543210
function normalize(v) {
  var s = String(v == null ? '' : v).replace(/\D/g, '');
  if (s.length === 10) s = '91' + s;
  else if (s.length === 11 && s.charAt(0) === '0') s = '91' + s.slice(1);
  return s.length >= 11 && s.length <= 15 ? s : '';
}

function ensureSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var enq = ss.getSheetByName(ENQ);
  if (enq.getRange(1, C.optIn).getValue() === '') enq.getRange(1, C.optIn, 1, 2).setValues([['WhatsApp opt-in', 'Welcome sent']]).setFontWeight('bold');
  var inc = ss.getSheetByName(INCOMING) || ss.insertSheet(INCOMING);
  if (inc.getLastRow() === 0) { inc.appendRow(['Received (IST)', 'From', 'Name', 'Message', 'Type', 'Message ID']); inc.setFrozenRows(1); inc.getRange(1, 1, 1, 6).setFontWeight('bold'); }
  var camp = ss.getSheetByName(CAMPAIGNS) || ss.insertSheet(CAMPAIGNS);
  if (camp.getLastRow() === 0) { camp.appendRow(['Sent at (IST)', 'Template', 'To', 'Name', 'Result', 'Message ID / error']); camp.setFrozenRows(1); camp.getRange(1, 1, 1, 6).setFontWeight('bold'); }
  return { enq: enq, incoming: inc, camp: camp };
}

function errText(j, r) { return (j && j.error && (j.error.message + (j.error.error_data && j.error.error_data.details ? ' – ' + j.error.error_data.details : ''))) || ('HTTP ' + r.getResponseCode()); }
function safeJson(s) { try { return JSON.parse(s); } catch (e) { return {}; } }
function fmtNow() { return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM HH:mm'); }
// Trim, cut to length, and stop text being treated as a formula (=, +, -, @).
function clean(v, max) {
  v = String(v == null ? '' : v).trim().slice(0, max);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
function out(s) { return ContentService.createTextOutput(s); }
