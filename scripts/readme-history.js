// Syncs the README "История версий" section from a GitHub release.
// Used by .github/workflows/readme-history.yml on `release: published`.
// Usage: node scripts/readme-history.js <tag> <release-body-file> [readme-path]
//
// Convention (keep release notes compatible with it):
//   - title line:      "## 1.0.21 — «Кодовое имя»"
//   - flat "- " bullets under "###" sections
//   - the "### 📦 Сборка" section and the "Full Changelog" line are dropped
//     (APK links already live on the release page).
// The script prepends a new open <details> entry, collapses the previous
// current one, and is idempotent (re-runs change nothing).
const fs = require('fs');

function main() {
  const [tag, bodyFile, readmePath = 'README.md'] = process.argv.slice(2);
  if (!tag || !bodyFile) {
    console.error('usage: node scripts/readme-history.js <tag> <release-body-file> [readme-path]');
    process.exit(2);
  }
  const version = tag.replace(/^v/, '');
  const body = fs.readFileSync(bodyFile, 'utf8').split('\n');
  let readme = fs.readFileSync(readmePath, 'utf8');

  if (readme.includes(`<b>${version} —`) || readme.includes(`<b>${version}</b>`)) {
    console.log(`README already has ${version}, nothing to do`);
    return;
  }

  let codename = version;
  const content = [];
  let inPkg = false;
  for (const line of body) {
    if (/^##\s+/.test(line)) {
      codename = line.replace(/^##\s+/, '').trim();
      inPkg = false;
      continue;
    }
    if (/^###\s+📦/.test(line)) {
      inPkg = true;
      continue;
    }
    if (/^(###\s+|\*\*)/.test(line)) inPkg = false;
    if (inPkg) continue;
    if (line.includes('Full Changelog')) continue;
    content.push(line);
  }
  const text = content.join('\n').replace(/^\s*\n/, '').replace(/\s+$/, '');
  if (!text) {
    console.error('empty entry body, aborting');
    process.exit(1);
  }

  const entry = `<details open>\n<summary><b>${codename}</b> (текущая)</summary>\n\n${text}\n\n</details>\n\n`;
  // Collapse the previous current entry FIRST, then prepend the new open one —
  // order matters: a blind replace after insertion would hit the new block.
  readme = readme.replace('<details open>', '<details>');
  const firstDetails = readme.indexOf('<details');
  if (firstDetails === -1) {
    console.error('no <details> block found in README, aborting');
    process.exit(1);
  }
  readme = readme.slice(0, firstDetails) + entry + readme.slice(firstDetails);

  fs.writeFileSync(readmePath, readme);
  console.log(`README history updated with ${codename}`);
}

main();
