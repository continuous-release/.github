#!/usr/bin/env node
// Render release notes from conventional commits in PREVIOUS_TAG..HEAD (or
// HEAD when there is no previous tag). Reads PREVIOUS_TAG, VERSION and
// GITHUB_REPOSITORY from the environment and writes markdown to stdout.

import { execFileSync } from 'node:child_process';

const previousTag = process.env.PREVIOUS_TAG || '';
const version = process.env.VERSION || '';
const repo = process.env.GITHUB_REPOSITORY || '';
const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';

let raw = '';
try {
  raw = execFileSync('git', ['log', range, '--format=%H%x1f%s%x1f%b%x1e'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
} catch {
  raw = '';
}

const records = raw
  .split('\x1e')
  .map((record) => record.trim())
  .filter(Boolean)
  .map((record) => {
    const [hash = '', subject = '', body = ''] = record.split('\x1f');
    return { hash, subject, body };
  });

const sections = [
  ['feat', 'Features'],
  ['fix', 'Bug Fixes'],
  ['perf', 'Performance'],
  ['revert', 'Reverts'],
  ['docs', 'Documentation'],
  ['refactor', 'Refactoring'],
  ['test', 'Tests'],
  ['build', 'Build System'],
  ['ci', 'CI'],
  ['chore', 'Chores'],
  ['style', 'Styles'],
];

const grouped = new Map(sections.map(([type]) => [type, []]));
const breaking = [];
const other = [];

for (const { hash, subject, body } of records) {
  if (/^Merge /.test(subject) || /^chore\(release\):/.test(subject)) continue;

  const match = subject.match(/^([a-zA-Z]+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/);

  if (/^BREAKING[ -]CHANGE:/m.test(body) || (match && match[3])) {
    breaking.push({ subject, hash });
  }

  if (!match) {
    other.push({ subject, hash });
    continue;
  }

  const type = match[1].toLowerCase();
  if (grouped.has(type)) grouped.get(type).push({ subject, hash });
  else other.push({ subject, hash });
}

const short = (hash) => hash.slice(0, 7);
const line = ({ subject, hash }) => `- ${subject} (${short(hash)})`;
const out = ["## What's Changed", ''];

if (breaking.length) {
  out.push('### ⚠ Breaking Changes', '', ...breaking.map(line), '');
}

for (const [type, title] of sections) {
  const items = grouped.get(type) || [];
  if (!items.length) continue;
  out.push(`### ${title}`, '', ...items.map(line), '');
}

if (other.length) {
  out.push('### Other Changes', '', ...other.map(line), '');
}

if (previousTag && repo && version) {
  out.push(
    `**Full Changelog**: https://github.com/${repo}/compare/${previousTag}...v${version}`,
    '',
  );
}

process.stdout.write(out.join('\n'));
