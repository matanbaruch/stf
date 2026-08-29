//
// Fold one release's generated notes into CHANGELOG.md.
//
// GitHub's generate-notes API returns a "## What's Changed" list, an optional
// "## New Contributors" list, and a "**Full Changelog**" link. CHANGELOG.md
// keeps only the first list under a "## <version> (<date>)" heading, which is
// what koral-- has pasted in by hand up to now.
//
// The bump commit itself is dropped: it is written by the same workflow that
// calls this, so it names the release rather than describing anything in it.
//
// usage: node changelog.js <CHANGELOG.md> <version> <date> <notes-file>
//

var fs = require('fs')

// A generated line looks like "* <title> by @<user> in <url>". Anything else in
// the section (blank lines, a stray paragraph) is not an entry.
var ENTRY = /^\* /

// A version bump names the release rather than describing anything in it, so it
// is noise in its own changelog. koral-- has stripped these by hand every time,
// in all three title forms he has used. Requiring a version number after the
// keyword keeps "Bump minitouch-prebuilt to 1.3.2" and "Update @devicefarmer/adbkit
// dependency version to 3.3.9" as the real entries they are.
var BUMP = /^\* (?:(?:Bump|Update) version (?:from|to)|Version bump to|Release) \d/i

function entries(notes) {
  // The API returns CRLF, so every line would keep a trailing \r and no heading
  // would ever match.
  var lines = notes.replace(/\r\n/g, '\n').split('\n')
  var start = lines.indexOf("## What's Changed")
  if (start < 0) {
    return []
  }

  var out = []
  for (var i = start + 1; i < lines.length; i++) {
    var line = lines[i].trim()
    if (line.indexOf('## ') === 0) {
      break
    }
    if (ENTRY.test(line) && !BUMP.test(line)) {
      out.push(line)
    }
  }
  return out
}

function insert(changelog, section) {
  var marker = '# Changelog\n'
  var at = changelog.indexOf(marker)
  if (at < 0) {
    return marker + '\n' + section + changelog
  }
  var head = changelog.slice(0, at + marker.length)
  return head + '\n' + section + changelog.slice(at + marker.length).replace(/^\n+/, '')
}

function main() {
  var file = process.argv[2]
  var version = process.argv[3]
  var date = process.argv[4]
  var notes = fs.readFileSync(process.argv[5], 'utf8')

  var changelog = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '# Changelog\n'
  if (changelog.indexOf('\n## ' + version + ' (') >= 0) {
    console.error('CHANGELOG.md already has a ' + version + ' section')
    process.exit(1)
  }

  var lines = entries(notes)
  if (!lines.length) {
    console.error('no "## What\'s Changed" entries in the generated notes')
    process.exit(1)
  }

  var section = '## ' + version + ' (' + date + ')\n\n' + lines.join('\n') + '\n\n'
  fs.writeFileSync(file, insert(changelog, section))
  console.log('added ' + lines.length + ' entries under ' + version)
}

if (require.main === module) {
  main()
}

module.exports = {entries: entries, insert: insert}
