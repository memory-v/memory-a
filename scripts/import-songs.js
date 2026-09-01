#!/usr/bin/env node
// Turns a Music.app playlist export (File > Library > Export Playlist...
// as a Text File) into one markdown entry per song under src/songs/,
// matching what the "Listening" section in /admin/ produces by hand —
// this is just the same thing, done for hundreds of songs at once.
//
// Usage:
//   node scripts/import-songs.js path/to/exported-playlist.txt

const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/import-songs.js <exported-playlist.txt>");
  process.exit(1);
}

// Detect the actual encoding from the file's byte-order-mark rather than
// guessing — Music.app's export can be UTF-16 (LE or BE) or plain UTF-8
// depending on macOS version.
const buf = fs.readFileSync(inputPath);
let text;
if (buf[0] === 0xff && buf[1] === 0xfe) {
  text = buf.slice(2).toString("utf16le");
} else if (buf[0] === 0xfe && buf[1] === 0xff) {
  // UTF-16BE: swap byte pairs, then decode as LE.
  const swapped = Buffer.alloc(buf.length - 2);
  for (let i = 2; i + 1 < buf.length; i += 2) {
    swapped[i - 2] = buf[i + 1];
    swapped[i - 1] = buf[i];
  }
  text = swapped.toString("utf16le");
} else if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
  text = buf.slice(3).toString("utf8");
} else {
  text = buf.toString("utf8");
}

// Split on any line-ending style, including lone CR (older Mac exports).
const lines = text.split(/\r\n|\r|\n/).filter(function (l) { return l.trim().length > 0; });
if (lines.length < 2) {
  console.error("No rows found after reading " + buf.length + " bytes. First 200 characters:");
  console.error(JSON.stringify(text.slice(0, 200)));
  process.exit(1);
}

const headers = lines[0].split("\t").map(function (h) { return h.trim().toLowerCase(); });
const nameIdx = headers.indexOf("name");
const artistIdx = headers.indexOf("artist");
const dateAddedIdx = headers.indexOf("date added");

if (nameIdx === -1 || artistIdx === -1) {
  console.error("Couldn't find 'Name' and 'Artist' columns. Found headers: " + headers.join(", "));
  process.exit(1);
}

const outDir = path.join(__dirname, "..", "src", "songs");
fs.mkdirSync(outDir, { recursive: true });

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function formatDate(value) {
  var d = value ? new Date(value) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function escapeYaml(str) {
  return String(str).replace(/"/g, '\\"');
}

var count = 0;
var seenSlugs = {};

for (var i = 1; i < lines.length; i++) {
  var cols = lines[i].split("\t");
  var title = (cols[nameIdx] || "").trim();
  var artist = (cols[artistIdx] || "").trim();
  if (!title) continue;

  var dateAdded = dateAddedIdx !== -1 ? cols[dateAddedIdx] : null;
  var dateStr = formatDate(dateAdded);

  var baseSlug = dateStr + "-" + slugify(title + "-" + artist);
  var slug = baseSlug;
  var n = 2;
  while (seenSlugs[slug]) {
    slug = baseSlug + "-" + n;
    n++;
  }
  seenSlugs[slug] = true;

  var frontmatter =
    "---\n" +
    "date: " + dateStr + "\n" +
    'title: "' + escapeYaml(title) + '"\n' +
    'artist: "' + escapeYaml(artist) + '"\n' +
    "---\n";

  fs.writeFileSync(path.join(outDir, slug + ".md"), frontmatter);
  count++;
}

console.log("Wrote " + count + " song entries to src/songs/");
