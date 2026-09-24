/**
 * Party Booking · Σύστημα Κρατήσεων Παιδικών Πάρτυ (open source, MIT)
 * https://github.com/evangelosvoulgarismd-dotcom/party-booking
 * Google Sheets + Google Calendar + φόρμα κινητού (web app)
 *
 * Εγκατάσταση: δες τον οδηγό (README.md). Σύντομα:
 *   1. Νέο Google Sheet > Επεκτάσεις > Apps Script
 *   2. Επικόλληση Code.gs και Index.html
 *   3. Εκτέλεση της setup() μία φορά
 *   4. Ανάπτυξη > Νέα ανάπτυξη > Εφαρμογή ιστού
 */

const TZ = 'Europe/Athens';
const SH_BOOK = 'Κρατήσεις';
const SH_SET = 'Ρυθμίσεις';
const SH_PKG = 'Πακέτα';
const SH_STATS = 'Στατιστικά';

const STATUS = {
  PENDING: 'Προκράτηση',
  CONFIRMED: 'Επιβεβαιωμένο',
  DONE: 'Ολοκληρώθηκε',
  CANCELLED: 'Ακυρώθηκε'
};
// Χρώματα Google Calendar: 5 = κίτρινο, 10 = πράσινο, 8 = γκρι
const STATUS_COLOR = { 'Προκράτηση': '5', 'Επιβεβαιωμένο': '10', 'Ολοκληρώθηκε': '8' };
const STATUS_ICON = { 'Προκράτηση': '⏳', 'Επιβεβαιωμένο': '🎂', 'Ολοκληρώθηκε': '✅' };

const TYPES = ['All Inclusive', 'Μεμονωμένες'];
const SOURCES = ['Facebook', 'Instagram', 'TikTok', 'Google', 'Σύσταση φίλου', 'Ήρθε σε πάρτυ', 'Περαστικός', 'Επαναλαμβανόμενος πελάτης', 'Άλλο'];
const PAY_METHODS = ['Μετρητά', 'Κάρτα', 'IRIS', 'Κατάθεση', 'Άλλο'];
const DAYS = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

const COLS = [
  ['id', 'ID'],
  ['created', 'Καταχωρήθηκε'],
  ['status', 'Κατάσταση'],
  ['start', 'Έναρξη'],
  ['end', 'Λήξη'],
  ['dayName', 'Ημέρα'],
  ['child', 'Όνομα παιδιού'],
  ['age', 'Ηλικία'],
  ['parent', 'Γονέας'],
  ['phone', 'Κινητό'],
  ['email', 'Email'],
  ['theme', 'Θέμα / ήρωας'],
  ['type', 'Τύπος'],
  ['kids', 'Παιδιά'],
  ['adults', 'Συνοδοί'],
  ['pkg', 'Πακέτο'],
  ['drinks', 'Ποτά συνοδών'],
  ['food', 'Φαγητό (επιλογές)'],
  ['foodCost', 'Κόστος φαγητού €'],
  ['cakeKg', 'Τούρτα (κιλά)'],
  ['themePrint', 'Εκτύπωση θέματος'],
  ['deposit', 'Προκαταβολή €'],
  ['depositPaid', 'Προκαταβολή ελήφθη'],
  ['payMethod', 'Τρόπος πληρωμής'],
  ['totalNet', 'Πακέτο χωρίς ΦΠΑ'],
  ['total', 'Σύνολο €'],
  ['balance', 'Υπόλοιπο €'],
  ['source', 'Πώς μας βρήκε'],
  ['bookedBy', 'Κράτηση από'],
  ['notes', 'Σημειώσεις'],
  ['eventId', 'Calendar ID']
];
const C = {}; COLS.forEach((c, i) => C[c[0]] = i); // κλειδί -> δείκτης στήλης (0-based)

const DEFAULT_SETTINGS = [
  ['BUSINESS_NAME', 'Ο παιδότοπός μας', 'Όνομα επιχείρησης (φόρμα, ημερολόγιο, μηνύματα)'],
  ['PIN', '', 'Κωδικός φόρμας. Αν μείνει κενός, η setup() φτιάχνει τυχαίο.'],
  ['CALENDAR_ID', '', 'Συμπληρώνεται αυτόματα από την setup()'],
  ['OWNER_EMAILS', '', 'Email για την καθημερινή σύνοψη (χωρισμένα με κόμμα)'],
  ['DIGEST_HOUR', 21, 'Ώρα αποστολής καθημερινής σύνοψης (0-23)'],
  ['DURATION_HOURS', 3, 'Διάρκεια πάρτυ σε ώρες'],
  ['BUFFER_MIN', 30, 'Λεπτά καθαρισμού/προετοιμασίας ανάμεσα σε πάρτυ'],
  ['MAX_PARALLEL', 1, 'Πόσα πάρτυ χωράνε ταυτόχρονα'],
  ['OPEN_TIME', '10:00', 'Πρώτη ώρα έναρξης που προτείνεται'],
  ['CLOSE_TIME', '21:30', 'Το πάρτυ πρέπει να έχει τελειώσει ως τότε'],
  ['DEPOSIT', 50, 'Προκαταβολή €'],
  ['VAT', 24, 'ΦΠΑ % (οι τιμές πακέτων είναι χωρίς ΦΠΑ)'],
  ['EXTRA_CHILD', 12, 'Επιπλέον παιδί, Μεμονωμένες (χωρίς ΦΠΑ)'],
  ['EXTRA_CHILD_AI', 17.6, 'Επιπλέον παιδί, All Inclusive (χωρίς ΦΠΑ)'],
  ['ADULT_DRINK', 3, 'Ποτό συνοδού ανά άτομο, Μεμονωμένες (χωρίς ΦΠΑ)'],
  ['CAKE_PER_KG', 17, 'Τούρτα ανά κιλό (τελική τιμή)'],
  ['THEME_PRINT', 12, 'Εκτύπωση θέματος στην τούρτα (τελική τιμή)'],
  ['ADDRESS', '', 'Διεύθυνση (μπαίνει στο Calendar και στο μήνυμα)'],
  ['PHONE', '', 'Τηλέφωνο καταστήματος (μπαίνει στο μήνυμα Viber)'],
  ['SEND_CLIENT_EMAIL', 'ΝΑΙ', 'Αποστολή email επιβεβαίωσης στον γονέα όταν δώσει email (ΝΑΙ/ΟΧΙ)']
];

const DEFAULT_PACKAGES = [
  ['Πακέτο', 'Έως παιδιά', 'Έως συνοδοί', 'Τιμή Μεμονωμένες (χωρίς ΦΠΑ)', 'Τιμή All Inclusive (χωρίς ΦΠΑ)'],
  ['Basic', 10, 20, 160, 301],
  ['Standard', 15, 30, 220, 434],
  ['Premium', 20, 40, 270, 538],
  ['VIP', 30, 60, 320, 714]
];

/* ============================ ΜΕΝΟΥ ============================ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🎉 Κρατήσεις')
    .addItem('Άνοιγμα φόρμας κρατήσεων', 'menuOpenForm')
    .addItem('Συγχρονισμός όλων με Calendar', 'menuSyncAll')
    .addItem('Αποστολή σύνοψης τώρα', 'dailyDigest')
    .addSeparator()
    .addItem('Αρχική εγκατάσταση / επισκευή', 'setup')
    .addToUi();
}

function menuOpenForm() {
  const url = ScriptApp.getService().getUrl();
  const ui = SpreadsheetApp.getUi();
  if (!url) {
    ui.alert('Η φόρμα δεν έχει αναπτυχθεί ακόμα.\n\nΣτο Apps Script: Ανάπτυξη > Νέα ανάπτυξη > Εφαρμογή ιστού.');
    return;
  }
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;font-size:14px">' +
    '<p>Σύνδεσμος φόρμας (αποθήκευσέ τον στην αρχική οθόνη του κινητού):</p>' +
    '<p><a href="' + url + '" target="_blank">' + url + '</a></p></div>'
  ).setWidth(460).setHeight(140);
  ui.showModalDialog(html, 'Φόρμα κρατήσεων');
}

function menuSyncAll() {
  const n = syncAll();
  SpreadsheetApp.getUi().alert('Συγχρονίστηκαν ' + n + ' κρατήσεις με το Google Calendar.');
}

/* ============================ SETUP ============================ */

/** Το Sheet των κρατήσεων. Στη φόρμα (web app) το getActive() μπορεί να είναι κενό, γι' αυτό κρατάμε και το ID. */
function ss_() {
  let ss = null;
  try { ss = SpreadsheetApp.getActive(); } catch (e) { ss = null; }
  if (ss) return ss;
  const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  if (!id) throw new Error('Τρέξε μία φορά τη setup() από το Apps Script.');
  return SpreadsheetApp.openById(id);
}

function setup() {
  const ss = SpreadsheetApp.getActive();
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
  ss.setSpreadsheetTimeZone(TZ);

  // --- Κρατήσεις ---
  let sh = ss.getSheetByName(SH_BOOK) || ss.insertSheet(SH_BOOK, 0);
  const headers = COLS.map(c => c[1]);
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#8a3b12').setFontColor('#ffffff').setWrap(true);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(C.start + 1);
  const rows = sh.getMaxRows() - 1;
  const col = k => sh.getRange(2, C[k] + 1, rows, 1);
  col('created').setNumberFormat('dd/MM/yyyy HH:mm');
  col('start').setNumberFormat('ddd dd/MM/yyyy HH:mm');
  col('end').setNumberFormat('HH:mm');
  col('phone').setNumberFormat('@');
  ['foodCost', 'deposit', 'totalNet', 'total', 'balance'].forEach(k => col(k).setNumberFormat('#,##0.00 €'));
  ['drinks', 'themePrint', 'depositPaid'].forEach(k => col(k).insertCheckboxes());
  const dv = list => SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build();
  col('status').setDataValidation(dv(Object.values(STATUS)));
  col('type').setDataValidation(dv(TYPES));
  col('source').setDataValidation(dv(SOURCES));
  col('payMethod').setDataValidation(dv(PAY_METHODS));
  sh.hideColumns(C.eventId + 1);
  sh.hideColumns(C.id + 1);

  // Χρώμα γραμμής ανά κατάσταση
  const statusLetter = colLetter(C.status);
  const full = sh.getRange(2, 1, rows, COLS.length);
  const rule = (txt, bg, fc) => SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusLetter + '2="' + txt + '"').setBackground(bg).setFontColor(fc || null).setRanges([full]).build();
  sh.setConditionalFormatRules([
    rule(STATUS.PENDING, '#fff4c2'),
    rule(STATUS.CONFIRMED, '#dff3e3'),
    rule(STATUS.DONE, '#eeeeee', '#666666'),
    rule(STATUS.CANCELLED, '#fbe3e3', '#a33')
  ]);
  sh.setColumnWidths(1, COLS.length, 120);
  sh.setColumnWidth(C.start + 1, 170);
  sh.setColumnWidth(C.notes + 1, 260);
  sh.setColumnWidth(C.food + 1, 200);

  // --- Ρυθμίσεις ---
  let st = ss.getSheetByName(SH_SET) || ss.insertSheet(SH_SET);
  if (st.getLastRow() < 2) {
    st.getRange('B:B').setNumberFormat('@'); // πρώτα κείμενο, για να μη γίνουν οι ώρες «ημερομηνίες»
    st.getRange(1, 1, 1, 3).setValues([['Κλειδί', 'Τιμή', 'Περιγραφή']]).setFontWeight('bold').setBackground('#8a3b12').setFontColor('#fff');
    st.getRange(2, 1, DEFAULT_SETTINGS.length, 3).setValues(DEFAULT_SETTINGS.map(r => [r[0], String(r[1]), r[2]]));
    st.setColumnWidth(1, 170); st.setColumnWidth(2, 320); st.setColumnWidth(3, 420);
  } else {
    // πρόσθεσε τυχόν νέα κλειδιά χωρίς να αγγίξεις τα υπάρχοντα
    const have = st.getRange(2, 1, st.getLastRow() - 1, 1).getValues().map(r => r[0]);
    DEFAULT_SETTINGS.filter(r => have.indexOf(r[0]) < 0).forEach(r => st.appendRow(r));
  }

  // --- Πακέτα ---
  let pk = ss.getSheetByName(SH_PKG) || ss.insertSheet(SH_PKG);
  if (pk.getLastRow() < 2) {
    pk.getRange(1, 1, DEFAULT_PACKAGES.length, 5).setValues(DEFAULT_PACKAGES);
    pk.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#8a3b12').setFontColor('#fff').setWrap(true);
    pk.setColumnWidths(1, 5, 150);
    pk.getRange(DEFAULT_PACKAGES.length + 2, 1).setValue('Τα πακέτα επιλέγονται αυτόματα από τον αριθμό παιδιών. Πάνω από το μεγαλύτερο πακέτο χρεώνεται «επιπλέον παιδί» από τις Ρυθμίσεις.').setFontStyle('italic');
  }

  // --- Ημερολόγιο ---
  const s = getSettings();
  if (!String(s.PIN || '').trim()) setSetting('PIN', String(Math.floor(100000 + Math.random() * 900000)));
  if (!s.OWNER_EMAILS) setSetting('OWNER_EMAILS', Session.getEffectiveUser().getEmail());
  let cal = s.CALENDAR_ID ? CalendarApp.getCalendarById(s.CALENDAR_ID) : null;
  if (!cal) {
    cal = CalendarApp.createCalendar(bizName_() + ' · Πάρτυ', { timeZone: TZ, color: CalendarApp.Color.RED_ORANGE });
    setSetting('CALENDAR_ID', cal.getId());
  }

  // --- Στατιστικά ---
  buildStats(ss);

  // --- Triggers ---
  ScriptApp.getProjectTriggers().forEach(t => {
    if (['onBookingEdit', 'dailyDigest'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onBookingEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('dailyDigest').timeBased().atHour(Number(getSettings().DIGEST_HOUR) || 21).everyDays(1).inTimezone(TZ).create();

  ss.setActiveSheet(sh);
  try {
    SpreadsheetApp.getUi().alert('✅ Η εγκατάσταση ολοκληρώθηκε.\n\n' +
      'Δημιουργήθηκε το ημερολόγιο «' + bizName_() + ' · Πάρτυ».\n' +
      'PIN φόρμας: ' + getSettings().PIN + ' (αλλάζει στο φύλλο «Ρυθμίσεις»).\n' +
      'Συμπλήρωσε BUSINESS_NAME, ADDRESS, PHONE στις «Ρυθμίσεις».\n\n' +
      'Επόμενο βήμα: Ανάπτυξη > Νέα ανάπτυξη > Εφαρμογή ιστού.');
  } catch (e) { /* εκτέλεση από τον editor χωρίς UI */ }
}

function buildStats(ss) {
  let sh = ss.getSheetByName(SH_STATS) || ss.insertSheet(SH_STATS);
  sh.clear();
  const B = "'" + SH_BOOK + "'!";
  const st = B + colLetter(C.status) + ':' + colLetter(C.status);
  const dt = B + colLetter(C.start) + ':' + colLetter(C.start);
  const tot = B + colLetter(C.total) + ':' + colLetter(C.total);
  const kids = B + colLetter(C.kids) + ':' + colLetter(C.kids);
  const typ = B + colLetter(C.type) + ':' + colLetter(C.type);
  const src = B + colLetter(C.source) + ':' + colLetter(C.source);
  const X = '"<>' + STATUS.CANCELLED + '"';

  sh.getRange('A1:F1').setValues([['Μήνας', 'Πάρτυ', 'Παιδιά', 'Τζίρος €', 'All Inclusive %', 'Ακυρώσεις']]);
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const r = i + 2;
    sh.getRange(r, 1).setFormula('=DATE(' + now.getFullYear() + ',' + (now.getMonth() + 1 - 3) + '+' + i + ',1)');
    const w = st + ',' + X + ',' + dt + ',">="&A' + r + ',' + dt + ',"<"&EDATE(A' + r + ',1)';
    sh.getRange(r, 2).setFormula('=COUNTIFS(' + w + ')');
    sh.getRange(r, 3).setFormula('=SUMIFS(' + kids + ',' + w + ')');
    sh.getRange(r, 4).setFormula('=SUMIFS(' + tot + ',' + w + ')');
    sh.getRange(r, 5).setFormula('=IFERROR(COUNTIFS(' + w + ',' + typ + ',"All Inclusive")/B' + r + ',0)');
    sh.getRange(r, 6).setFormula('=COUNTIFS(' + st + ',"' + STATUS.CANCELLED + '",' + dt + ',">="&A' + r + ',' + dt + ',"<"&EDATE(A' + r + ',1))');
  }
  sh.getRange('A2:A19').setNumberFormat('mmmm yyyy');
  sh.getRange('D2:D19').setNumberFormat('#,##0 €');
  sh.getRange('E2:E19').setNumberFormat('0%');

  sh.getRange('H1:I1').setValues([['Πώς μας βρήκαν', 'Πάρτυ']]);
  SOURCES.forEach((s, i) => {
    sh.getRange(i + 2, 8).setValue(s);
    sh.getRange(i + 2, 9).setFormula('=COUNTIFS(' + src + ',H' + (i + 2) + ',' + st + ',' + X + ')');
  });
  sh.getRange('A1:I1').setFontWeight('bold').setBackground('#8a3b12').setFontColor('#fff');
  sh.setColumnWidth(1, 140); sh.setColumnWidth(8, 200);
}

/* ============================ ΡΥΘΜΙΣΕΙΣ ============================ */

function getSettings() {
  const sh = ss_().getSheetByName(SH_SET);
  const o = {};
  DEFAULT_SETTINGS.forEach(r => o[r[0]] = r[1]);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(r => { if (r[0]) o[String(r[0]).trim()] = r[1]; });
  }
  ['DURATION_HOURS', 'BUFFER_MIN', 'MAX_PARALLEL', 'DEPOSIT', 'VAT', 'EXTRA_CHILD', 'EXTRA_CHILD_AI', 'ADULT_DRINK', 'CAKE_PER_KG', 'THEME_PRINT', 'DIGEST_HOUR']
    .forEach(k => o[k] = toNum(o[k]));
  return o;
}

function setSetting(key, value) {
  const sh = ss_().getSheetByName(SH_SET);
  const keys = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => r[0]);
  const i = keys.indexOf(key);
  if (i >= 0) sh.getRange(i + 2, 2).setValue(value); else sh.appendRow([key, value, '']);
}

function getPackages() {
  const sh = ss_().getSheetByName(SH_PKG);
  const rows = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues() : DEFAULT_PACKAGES.slice(1);
  return rows.filter(r => r[0] && toNum(r[1]) > 0)
    .map(r => ({ name: String(r[0]), maxKids: toNum(r[1]), maxAdults: toNum(r[2]), price: toNum(r[3]), priceAI: toNum(r[4]) }))
    .sort((a, b) => a.maxKids - b.maxKids);
}

function getCalendar(s) {
  s = s || getSettings();
  const cal = s.CALENDAR_ID ? CalendarApp.getCalendarById(s.CALENDAR_ID) : null;
  if (!cal) throw new Error('Δεν βρέθηκε ημερολόγιο. Τρέξε «Αρχική εγκατάσταση» από το μενού 🎉 Κρατήσεις.');
  return cal;
}

/* ============================ ΤΙΜΟΛΟΓΗΣΗ ============================ */
// Ίδια λογική υπάρχει και στο Index.html για τη ζωντανή προεπισκόπηση.
function calcPrice(b, s, pkgs) {
  const kids = Math.max(0, toNum(b.kids));
  const adults = Math.max(0, toNum(b.adults));
  const ai = b.type === 'All Inclusive';
  let pkg = pkgs.find(p => kids <= p.maxKids) || pkgs[pkgs.length - 1];
  const extraKids = Math.max(0, kids - pkg.maxKids);
  const vat = 1 + s.VAT / 100;
  let net = (ai ? pkg.priceAI : pkg.price) + extraKids * (ai ? s.EXTRA_CHILD_AI : s.EXTRA_CHILD);
  if (!ai && truthy(b.drinks)) net += adults * s.ADULT_DRINK;
  let extras = 0; // τελικές τιμές συνεργατών (Μεμονωμένες μόνο)
  if (!ai) {
    extras += toNum(b.foodCost);
    extras += toNum(b.cakeKg) * s.CAKE_PER_KG;
    if (truthy(b.themePrint)) extras += s.THEME_PRINT;
  }
  const total = round2(net * vat + extras);
  const deposit = toNum(b.deposit);
  const balance = round2(total - (truthy(b.depositPaid) ? deposit : 0));
  return {
    pkg: pkg.name + (extraKids ? ' +' + extraKids : ''),
    pkgBase: pkg.name, extraKids: extraKids,
    adultsOver: Math.max(0, adults - pkg.maxAdults),
    net: round2(net), extras: round2(extras), total: total, balance: balance
  };
}

/* ============================ WEB APP ============================ */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Κρατήσεις πάρτυ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function checkPin_(pin) {
  const s = getSettings();
  const norm = v => String(v == null ? '' : v).replace(/\s+/g, '').replace(/\.0+$/, '');
  const a = norm(pin), b = norm(s.PIN);
  const ok = a && (a === b || (/^\d+$/.test(a) && /^\d+$/.test(b) && Number(a) === Number(b)));
  if (!ok) throw new Error('Λάθος PIN. Το σωστό είναι στο φύλλο «Ρυθμίσεις», γραμμή PIN.');
  return s;
}

function api_init(pin) {
  const s = checkPin_(pin);
  return {
    name: String(s.BUSINESS_NAME || ''),
    packages: getPackages(),
    settings: {
      DEPOSIT: s.DEPOSIT, VAT: s.VAT, EXTRA_CHILD: s.EXTRA_CHILD, EXTRA_CHILD_AI: s.EXTRA_CHILD_AI,
      ADULT_DRINK: s.ADULT_DRINK, CAKE_PER_KG: s.CAKE_PER_KG, THEME_PRINT: s.THEME_PRINT,
      DURATION_HOURS: s.DURATION_HOURS, BUFFER_MIN: s.BUFFER_MIN, MAX_PARALLEL: s.MAX_PARALLEL, OPEN_TIME: String(s.OPEN_TIME), CLOSE_TIME: String(s.CLOSE_TIME)
    },
    sources: SOURCES, payMethods: PAY_METHODS,
    today: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd')
  };
}

/** Ό,τι υπάρχει στο ημερολόγιο μια μέρα (κρατήσεις και χειροκίνητα «κλειστό» κ.λπ.) */
function api_day(pin, dateStr, excludeId) {
  const s = checkPin_(pin);
  const cal = getCalendar(s);
  const own = excludeId ? findRow_(excludeId) : null;
  const ownEv = own ? own.b.eventId : '';
  const d0 = Utilities.parseDate(dateStr + ' 00:00', TZ, 'yyyy-MM-dd HH:mm');
  const d1 = new Date(d0.getTime() + 24 * 3600 * 1000);
  return cal.getEvents(d0, d1).filter(e => e.getId() !== ownEv).map(e => ({
    title: e.getTitle(),
    allDay: e.isAllDayEvent(),
    from: Utilities.formatDate(e.getStartTime(), TZ, 'HH:mm'),
    to: Utilities.formatDate(e.getEndTime(), TZ, 'HH:mm'),
    m0: Math.round((e.getStartTime() - d0) / 60000),
    m1: Math.round((e.getEndTime() - d0) / 60000)
  }));
}

function api_list(pin, includePast) {
  checkPin_(pin);
  const all = readAll_();
  const today0 = Utilities.parseDate(Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd') + ' 00:00', TZ, 'yyyy-MM-dd HH:mm');
  const from = includePast ? new Date(today0.getTime() - 60 * 24 * 3600 * 1000) : today0;
  return all.filter(b => b.start instanceof Date && b.start >= from)
    .sort((a, b) => a.start - b.start)
    .map(toClient_);
}

function api_get(pin, id) {
  checkPin_(pin);
  const f = findRow_(id);
  if (!f) throw new Error('Δεν βρέθηκε η κράτηση');
  return toClient_(f.b);
}

function api_save(pin, data) {
  const s = checkPin_(pin);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // --- έλεγχοι ---
    const req = { date: 'Ημερομηνία', time: 'Ώρα', child: 'Όνομα παιδιού', parent: 'Γονέας', phone: 'Κινητό', kids: 'Αριθμός παιδιών' };
    const missing = Object.keys(req).filter(k => !String(data[k] == null ? '' : data[k]).trim());
    if (missing.length) return { ok: false, error: 'Συμπλήρωσε: ' + missing.map(k => req[k]).join(', ') };

    const start = Utilities.parseDate(data.date + ' ' + data.time, TZ, 'yyyy-MM-dd HH:mm');
    const end = new Date(start.getTime() + s.DURATION_HOURS * 3600 * 1000);

    const existing = data.id ? findRow_(data.id) : null;
    const cal = getCalendar(s);

    if (!data.force) {
      const buf = s.BUFFER_MIN * 60 * 1000;
      const clashes = cal.getEvents(new Date(start.getTime() - buf), new Date(end.getTime() + buf))
        .filter(e => !(existing && existing.b.eventId && e.getId() === existing.b.eventId));
      if (clashes.length >= s.MAX_PARALLEL) {
        return {
          ok: false, conflict: clashes.map(e => ({
            title: e.getTitle(),
            from: Utilities.formatDate(e.getStartTime(), TZ, 'HH:mm'),
            to: Utilities.formatDate(e.getEndTime(), TZ, 'HH:mm')
          }))
        };
      }
    }

    // --- εγγραφή ---
    const b = existing ? existing.b : { id: newId_(), created: new Date(), eventId: '' };
    b.start = start; b.end = end; b.dayName = DAYS[Number(Utilities.formatDate(start, TZ, 'u')) % 7];
    ['child', 'age', 'parent', 'phone', 'email', 'theme', 'type', 'food', 'payMethod', 'source', 'bookedBy', 'notes']
      .forEach(k => b[k] = String(data[k] == null ? '' : data[k]).trim());
    b.type = TYPES.indexOf(b.type) >= 0 ? b.type : TYPES[0];
    b.kids = toNum(data.kids); b.adults = toNum(data.adults);
    b.drinks = truthy(data.drinks); b.themePrint = truthy(data.themePrint); b.depositPaid = truthy(data.depositPaid);
    b.foodCost = toNum(data.foodCost); b.cakeKg = toNum(data.cakeKg);
    b.deposit = data.deposit === '' || data.deposit == null ? s.DEPOSIT : toNum(data.deposit);
    b.status = autoStatus_(b, existing ? existing.b.status : '');

    const p = calcPrice(b, s, getPackages());
    b.pkg = p.pkg; b.totalNet = p.net; b.total = p.total; b.balance = p.balance;

    syncEvent_(b, cal, s);
    writeRow_(b, existing ? existing.row : null, true);

    if (!existing && b.email && String(s.SEND_CLIENT_EMAIL).toUpperCase().indexOf('Ν') === 0) {
      try { sendClientEmail_(b, s); } catch (e) { console.warn('email', e); }
    }
    return { ok: true, id: b.id, booking: toClient_(b), viber: viberText_(b, s), warnings: p.adultsOver ? ['Οι συνοδοί ξεπερνούν το όριο του πακέτου κατά ' + p.adultsOver + '.'] : [] };
  } finally {
    lock.releaseLock();
  }
}

function api_setStatus(pin, id, status) {
  const s = checkPin_(pin);
  const f = findRow_(id);
  if (!f) throw new Error('Δεν βρέθηκε η κράτηση');
  if (Object.values(STATUS).indexOf(status) < 0) throw new Error('Άγνωστη κατάσταση');
  f.b.status = status;
  syncEvent_(f.b, getCalendar(s), s);
  writeRow_(f.b, f.row);
  return toClient_(f.b);
}

function api_depositPaid(pin, id, method) {
  const s = checkPin_(pin);
  const f = findRow_(id);
  if (!f) throw new Error('Δεν βρέθηκε η κράτηση');
  f.b.depositPaid = true;
  if (method) f.b.payMethod = method;
  f.b.status = autoStatus_(f.b, f.b.status);
  const p = calcPrice(f.b, s, getPackages());
  f.b.balance = p.balance;
  syncEvent_(f.b, getCalendar(s), s);
  writeRow_(f.b, f.row);
  return { booking: toClient_(f.b), viber: viberText_(f.b, s) };
}

function api_viber(pin, id) {
  const s = checkPin_(pin);
  const f = findRow_(id);
  if (!f) throw new Error('Δεν βρέθηκε η κράτηση');
  return viberText_(f.b, s);
}

/* ============================ CALENDAR ============================ */

function syncEvent_(b, cal, s) {
  let ev = null;
  if (b.eventId) { try { ev = cal.getEventById(b.eventId); } catch (e) { ev = null; } }

  if (b.status === STATUS.CANCELLED) {
    if (ev) ev.deleteEvent();
    b.eventId = '';
    return;
  }
  const title = (STATUS_ICON[b.status] || '🎂') + ' ' + b.child + (b.age ? ' (' + b.age + ')' : '') +
    ' · ' + b.kids + ' παιδιά · ' + (b.type === 'All Inclusive' ? 'AI ' : '') + b.pkg;
  const desc = eventDescription_(b, s);
  if (ev) {
    ev.setTime(b.start, b.end);
    ev.setTitle(title);
    ev.setDescription(desc);
    ev.setLocation(s.ADDRESS);
  } else {
    ev = cal.createEvent(title, b.start, b.end, { description: desc, location: s.ADDRESS });
    ev.removeAllReminders();
    ev.addPopupReminder(24 * 60);
    ev.addPopupReminder(120);
  }
  ev.setColor(STATUS_COLOR[b.status] || '10');
  b.eventId = ev.getId();
}

function eventDescription_(b, s) {
  const L = [];
  L.push('Κατάσταση: ' + b.status);
  L.push('Γονέας: ' + b.parent + '  ☎ ' + b.phone + (b.email ? '  ✉ ' + b.email : ''));
  if (b.theme) L.push('Θέμα: ' + b.theme);
  L.push('Πακέτο: ' + b.type + ' · ' + b.pkg + ' · ' + b.kids + ' παιδιά / ' + b.adults + ' συνοδοί');
  if (b.type !== 'All Inclusive') {
    if (b.drinks) L.push('Ποτά συνοδών: ΝΑΙ');
    if (b.food) L.push('Φαγητό: ' + b.food + (b.foodCost ? ' (' + euro(b.foodCost) + ')' : ''));
    if (b.cakeKg) L.push('Τούρτα: ' + b.cakeKg + ' κιλά' + (b.themePrint ? ' + εκτύπωση θέματος' : ''));
  } else if (b.food) L.push('Φαγητό: ' + b.food);
  L.push('');
  L.push('Σύνολο: ' + euro(b.total));
  L.push('Προκαταβολή: ' + euro(b.deposit) + (b.depositPaid ? ' ✅ ελήφθη' + (b.payMethod ? ' (' + b.payMethod + ')' : '') : ' ⏳ εκκρεμεί'));
  L.push('Υπόλοιπο στο πάρτυ: ' + euro(b.balance));
  if (b.notes) { L.push(''); L.push('Σημειώσεις: ' + b.notes); }
  L.push('');
  L.push('Κράτηση από: ' + (b.bookedBy || '-') + ' · Πηγή: ' + (b.source || '-') + ' · #' + b.id);
  return L.join('\n');
}

function syncAll() {
  const s = getSettings(), cal = getCalendar(s), pkgs = getPackages();
  const sh = ss_().getSheetByName(SH_BOOK);
  let n = 0;
  readAll_().forEach(x => {
    if (!(x.start instanceof Date)) return;
    x.end = new Date(x.start.getTime() + s.DURATION_HOURS * 3600 * 1000);
    x.dayName = DAYS[Number(Utilities.formatDate(x.start, TZ, 'u')) % 7];
    const p = calcPrice(x, s, pkgs);
    x.pkg = p.pkg; x.totalNet = p.net; x.total = p.total; x.balance = p.balance;
    if (!x.id) x.id = newId_();
    syncEvent_(x, cal, s);
    writeRow_(x, x._row);
    n++;
  });
  return n;
}

/** Installable trigger: αλλαγές απευθείας στο Sheet ενημερώνουν το Calendar */
function onBookingEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== SH_BOOK) return;
  const r0 = Math.max(2, e.range.getRow()), r1 = e.range.getLastRow();
  if (r1 < 2) return;
  const c0 = e.range.getColumn() - 1, c1 = e.range.getLastColumn() - 1;
  if (c0 <= C.eventId && c1 >= C.eventId && c0 === c1) return; // αγνόησε αλλαγές μόνο στο Calendar ID
  const s = getSettings(), cal = getCalendar(s), pkgs = getPackages();
  const values = sh.getRange(r0, 1, r1 - r0 + 1, COLS.length).getValues();
  values.forEach((row, i) => {
    const b = rowToObj_(row);
    if (!(b.start instanceof Date) || !b.child) return;
    if (!b.id) { b.id = newId_(); b.created = new Date(); }
    b.end = new Date(b.start.getTime() + s.DURATION_HOURS * 3600 * 1000);
    b.dayName = DAYS[Number(Utilities.formatDate(b.start, TZ, 'u')) % 7];
    if (!b.type) b.type = TYPES[0];
    if (b.deposit === '' || b.deposit == null) b.deposit = s.DEPOSIT;
    const statusEdited = c0 <= C.status && c1 >= C.status;
    if (!statusEdited) b.status = autoStatus_(b, b.status);
    else if (!b.status) b.status = autoStatus_(b, '');
    const p = calcPrice(b, s, pkgs);
    b.pkg = p.pkg; b.totalNet = p.net; b.total = p.total; b.balance = p.balance;
    syncEvent_(b, cal, s);
    writeRow_(b, r0 + i);
  });
}

/* ============================ ΚΑΘΗΜΕΡΙΝΗ ΣΥΝΟΨΗ ============================ */

function dailyDigest() {
  const s = getSettings();
  const cal = getCalendar(s);
  const now = new Date();
  const todayStr = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  const today0 = Utilities.parseDate(todayStr + ' 00:00', TZ, 'yyyy-MM-dd HH:mm');
  const day = 24 * 3600 * 1000;
  const tomorrow0 = new Date(today0.getTime() + day), tomorrow1 = new Date(today0.getTime() + 2 * day);
  const week1 = new Date(today0.getTime() + 8 * day);

  const all = readAll_().filter(b => b.start instanceof Date);

  // 1. Αυτόματο «Ολοκληρώθηκε» για επιβεβαιωμένα πάρτυ που πέρασαν
  all.filter(b => b.status === STATUS.CONFIRMED && b.end instanceof Date && b.end < now).forEach(b => {
    b.status = STATUS.DONE; syncEvent_(b, cal, s); writeRow_(b, b._row);
  });

  const active = all.filter(b => b.status === STATUS.PENDING || b.status === STATUS.CONFIRMED);
  const tomorrow = active.filter(b => b.start >= tomorrow0 && b.start < tomorrow1).sort((a, b) => a.start - b.start);
  const noDeposit = active.filter(b => !b.depositPaid && b.start >= today0 && b.start < week1).sort((a, b) => a.start - b.start);
  const week = active.filter(b => b.start >= tomorrow1 && b.start < week1).sort((a, b) => a.start - b.start);
  const newToday = all.filter(b => b.created instanceof Date && Utilities.formatDate(b.created, TZ, 'yyyy-MM-dd') === todayStr);

  if (!tomorrow.length && !noDeposit.length && !week.length && !newToday.length) return;

  const line = b => '<li><b>' + Utilities.formatDate(b.start, TZ, 'dd/MM HH:mm') + '</b> · ' + esc(b.child) +
    (b.age ? ' (' + esc(b.age) + ')' : '') + ' · ' + b.kids + ' παιδιά · ' + esc(b.type) + ' ' + esc(b.pkg) +
    ' · ' + esc(b.parent) + ' ' + esc(b.phone) + ' · <b>' + euro(b.total) + '</b>' +
    (b.depositPaid ? '' : ' <span style="color:#b45309">(χωρίς προκαταβολή)</span>') + '</li>';
  const sec = (t, arr) => arr.length ? '<h3 style="color:#8a3b12;margin:18px 0 6px">' + t + ' (' + arr.length + ')</h3><ul>' + arr.map(line).join('') + '</ul>' : '';
  const revWeek = tomorrow.concat(week).reduce((a, b) => a + toNum(b.total), 0);

  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#3b2412">' +
    '<h2 style="color:#8a3b12">🎉 ' + esc(bizName_()) + ' · Σύνοψη ' + Utilities.formatDate(now, TZ, 'dd/MM/yyyy') + '</h2>' +
    sec('🎂 Αύριο', tomorrow) +
    sec('⏳ Χωρίς προκαταβολή (επόμενες 7 μέρες)', noDeposit) +
    sec('📅 Υπόλοιπη εβδομάδα', week) +
    sec('🆕 Νέες κρατήσεις σήμερα', newToday) +
    '<p style="margin-top:18px">Αναμενόμενος τζίρος επόμενων 7 ημερών: <b>' + euro(revWeek) + '</b></p>' +
    '<p style="color:#888;font-size:12px">Υπενθύμιση όρων: οριστικός αριθμός παιδιών και επιλογές φαγητού/τούρτας έως την Τετάρτη της εβδομάδας του πάρτυ. Παραγγελία τούρτας τουλάχιστον 5 μέρες πριν.</p></div>';

  const to = String(s.OWNER_EMAILS || Session.getEffectiveUser().getEmail());
  MailApp.sendEmail({ to: to, subject: '🎉 ' + bizName_() + ' · ' + tomorrow.length + ' πάρτυ αύριο · ' + noDeposit.length + ' χωρίς προκαταβολή', htmlBody: html });
}

/* ============================ ΜΗΝΥΜΑΤΑ ============================ */

function viberText_(b, s) {
  const d = Utilities.formatDate(b.start, TZ, 'dd/MM/yyyy');
  const t0 = Utilities.formatDate(b.start, TZ, 'HH:mm'), t1 = Utilities.formatDate(b.end, TZ, 'HH:mm');
  const L = [];
  L.push('Γεια σας! 🎉');
  L.push('Η κράτηση για το πάρτυ ' + (b.child ? 'του/της ' + b.child + ' ' : '') + 'καταχωρήθηκε (' + bizName_() + '):');
  L.push('');
  L.push('📅 ' + b.dayName + ' ' + d + ', ' + t0 + ' έως ' + t1);
  L.push('👧 ' + b.kids + ' παιδιά · ' + b.adults + ' συνοδοί');
  L.push('🎁 ' + b.type + ' · ' + b.pkg);
  if (b.theme) L.push('✨ Θέμα: ' + b.theme);
  L.push('💶 Σύνολο: ' + euro(b.total) + ' (με ΦΠΑ)');
  if (b.depositPaid) {
    L.push('✅ Λάβαμε την προκαταβολή ' + euro(b.deposit) + '. Υπόλοιπο στο πάρτυ: ' + euro(b.balance));
  } else {
    L.push('⏳ Για να οριστικοποιηθεί η ημερομηνία χρειάζεται προκαταβολή ' + euro(b.deposit) + ' (δεν επιστρέφεται σε ακύρωση).');
  }
  L.push('');
  L.push('📝 Τον οριστικό αριθμό παιδιών και τις επιλογές φαγητού/τούρτας μάς τα λέτε έως την Τετάρτη της εβδομάδας του πάρτυ.');
  L.push('Παρακαλούμε απαντήστε με ονοματεπώνυμο και ημερομηνία για αποδοχή των όρων.');
  L.push('');
  L.push('📆 Προσθήκη στο ημερολόγιό σας: ' + gcalLink_(b, s));
  if (s.ADDRESS) L.push('📍 ' + s.ADDRESS);
  if (s.PHONE) L.push('☎ ' + s.PHONE);
  L.push(bizName_() + ' 🎉');
  return L.join('\n');
}

function gcalLink_(b, s) {
  const f = d => Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent('🎂 Πάρτυ ' + b.child + ' · ' + bizName_()) +
    '&dates=' + f(b.start) + '/' + f(b.end) +
    '&location=' + encodeURIComponent(s.ADDRESS);
}

function sendClientEmail_(b, s) {
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#3b2412;line-height:1.5">' +
    viberText_(b, s).split('\n').map(esc).join('<br>').replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">εδώ</a>') + '</div>';
  MailApp.sendEmail({ to: b.email, subject: '🎂 Η κράτησή σας · ' + bizName_() + ' · ' + Utilities.formatDate(b.start, TZ, 'dd/MM/yyyy'), htmlBody: html, name: bizName_() });
}

/* ============================ ΒΟΗΘΗΤΙΚΑ ============================ */

function readAll_() {
  const sh = ss_().getSheetByName(SH_BOOK);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, COLS.length).getValues()
    .map((r, i) => { const b = rowToObj_(r); b._row = i + 2; return b; })
    .filter(b => b.child || b.start);
}

function findRow_(id) {
  if (!id) return null;
  const b = readAll_().find(x => String(x.id) === String(id));
  return b ? { b: b, row: b._row } : null;
}

function rowToObj_(r) {
  const b = {};
  COLS.forEach((c, i) => b[c[0]] = r[i]);
  b.kids = toNum(b.kids); b.adults = toNum(b.adults);
  b.drinks = truthy(b.drinks); b.themePrint = truthy(b.themePrint); b.depositPaid = truthy(b.depositPaid);
  b.phone = String(b.phone || '');
  return b;
}

function writeRow_(b, row, sort) {
  const sh = ss_().getSheetByName(SH_BOOK);
  const vals = COLS.map(c => (b[c[0]] === undefined || b[c[0]] === null) ? '' : b[c[0]]);
  if (!row) row = sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, vals.length).setValues([vals]);
  // ταξινόμηση κατά ημερομηνία πάρτυ (μόνο από τη φόρμα, για να μη «πηδάνε» γραμμές ενώ γράφεις στο Sheet)
  if (sort && sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, COLS.length).sort({ column: C.start + 1, ascending: true });
}

function toClient_(b) {
  return {
    id: String(b.id), status: b.status,
    date: b.start instanceof Date ? Utilities.formatDate(b.start, TZ, 'yyyy-MM-dd') : '',
    time: b.start instanceof Date ? Utilities.formatDate(b.start, TZ, 'HH:mm') : '',
    endTime: b.end instanceof Date ? Utilities.formatDate(b.end, TZ, 'HH:mm') : '',
    dayName: b.dayName || '',
    child: b.child || '', age: String(b.age || ''), parent: b.parent || '', phone: String(b.phone || ''), email: b.email || '',
    theme: b.theme || '', type: b.type || TYPES[0], kids: toNum(b.kids), adults: toNum(b.adults), pkg: b.pkg || '',
    drinks: truthy(b.drinks), food: b.food || '', foodCost: toNum(b.foodCost), cakeKg: toNum(b.cakeKg), themePrint: truthy(b.themePrint),
    deposit: toNum(b.deposit), depositPaid: truthy(b.depositPaid), payMethod: b.payMethod || '',
    total: toNum(b.total), balance: toNum(b.balance), source: b.source || '', bookedBy: b.bookedBy || '', notes: b.notes || ''
  };
}

function autoStatus_(b, current) {
  if (current === STATUS.CANCELLED || current === STATUS.DONE) return current;
  return b.depositPaid ? STATUS.CONFIRMED : STATUS.PENDING;
}

function bizName_() { return String(getSettings().BUSINESS_NAME || 'Κρατήσεις'); }
function newId_() { return Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10); }
function colLetter(i) { let s = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function toNum(v) { if (typeof v === 'number') return v; const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; }
function truthy(v) { return v === true || v === 'true' || v === 'TRUE' || v === 1 || v === 'ΝΑΙ' || v === 'on'; }
function round2(n) { return Math.round(n * 100) / 100; }
function euro(n) { return toNum(n).toFixed(2).replace('.', ',') + '€'; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
