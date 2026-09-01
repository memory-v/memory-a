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

const raw = fs.readFileSync(inputPath, "utf16le").length > 0
  ? fs.readFileSync(inputPath, "utf16le")
  : fs.readFileSync(inputPath, "utf8");

// Music.app's text export is usually UTF-16 with a BOM; fall back to UTF-8
// if that produces garbage (no tab characters found).
const text = raw.includes("\t") ? raw : fs.readFileSync(inputPath, "utf8");

const lines = text.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
if (lines.length < 2) {
  console.error("No rows found — is this the right file?");
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
