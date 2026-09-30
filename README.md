# NTAS website – GitHub Pages
1. Create a repo, upload index.html, style.css, script.js.
2. Settings → Pages → Deploy from branch → main / root.
3. GoDaddy DNS: A records to 185.199.108.153, .109.153, .110.153, .111.153; CNAME www → <username>.github.io. Add a file named CNAME containing your domain.

## Enquiries into Google Sheet
1. New Google Sheet, header row: name | mobile | service | message | time
2. Extensions → Apps Script, paste:
```
function doPost(e){var d=JSON.parse(e.postData.contents);
SpreadsheetApp.getActiveSheet().appendRow([d.name,d.mobile,d.service,d.message,d.time]);
return ContentService.createTextOutput("ok");}
```
3. Deploy → New deployment → Web app → Execute as Me, access Anyone. Copy the URL into SHEET_URL in script.js.
Every enquiry also opens WhatsApp to your number (WHATSAPP in script.js).
