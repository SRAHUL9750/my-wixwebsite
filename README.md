# NTAS website

Static site for www.nextechalign.com, published with GitHub Pages (Settings → Pages → main / root). `CNAME` holds the domain.

## Enquiries
The contact form and every WhatsApp button save each enquiry to the "NTAS Website Enquiries" Google Sheet and opens WhatsApp (`WHATSAPP` in `script.js`).
The sheet receives rows through a Google Apps Script web app bound to the sheet; its URL is `SHEET_URL` in `script.js`.
The script lives in `apps-script/ntas-whatsapp.gs` (paste it into the sheet's Extensions → Apps Script). It also:
- sends a WhatsApp welcome template to new enquiries (Meta Cloud API),
- sends marketing templates to contacts who ticked the WhatsApp opt-in box (sheet menu: WhatsApp → Send campaign),
- logs incoming WhatsApp messages and handles STOP opt-outs (Meta webhook → the same web app URL).

The WhatsApp access token is stored only in the script's private Script Properties (sheet menu: WhatsApp → Settings), never in this repository.
