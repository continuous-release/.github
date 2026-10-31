#!/usr/bin/env node
// Compute the next release version from conventional commits since the last
// v* tag. Writes GitHub Actions outputs when GITHUB_OUTPUT is set; otherwise
// prints key=value lines.
//
// Rules:
//   - no previous tag            -> 0.1.0
//   - BREAKING CHANGE / type!    -> major
//   - feat                       -> minor
//   - anything else              -> patch
//   - Release-As: X.Y.Z footer   -> X.Y.Z (manual override)
//   - HEAD already tagged v*     -> reuse that version (idempotent re-runs)

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const git = (...args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trim();

function tagsAtHead() {
  try {
    return git('tag', '--points-at', 'HEAD', '--list', 'v*')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function lastTag() {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0', '--match', 'v*'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function commitsSince(range) {
  const raw = execFileSync('git', ['log', range, '--format=%B%x00'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return raw
    .split('\0')
    .map((c) => c.trim())
    .filter(Boolean);
}

const headTags = tagsAtHead();
const existing = headTags.length > 0;
const previousTag = lastTag();

let version;

if (existing) {
  version = headTags[0].replace(/^v/, '');
} else {
  const commits = commitsSince(previousTag ? `${previousTag}..HEAD` : 'HEAD');
  let breaking = false;
  let feature = false;
  let releaseAs = '';

  for (const body of commits) {
    const [subject = ''] = body.split('\n');
    const type = subject.match(/^([a-zA-Z]+)(?:\([^)]*\))?(!)?:/);

    if (/^BREAKING[ -]CHANGE:/m.test(body) || (type && type[2] === '!')) {
      breaking = true;
    } else if (type && type[1].toLowerCase() === 'feat') {
      feature = true;
    }

    const forced = body.match(/^Release-As:\s*(\S+)\s*$/im);
    if (forced && !releaseAs) releaseAs = forced[1].replace(/^v/, '');
  }

  if (releaseAs) {
    version = releaseAs;
  } else if (!previousTag) {
    version = '0.1.0';
  } else {
    const [major, minor, patch] = previousTag
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10));

    if ([major, minor, patch].some(Number.isNaN)) {
      throw new Error(`Last tag ${previousTag} is not vMAJOR.MINOR.PATCH`);
    }

    version = breaking
      ? `${major + 1}.0.0`
      : feature
        ? `${major}.${minor + 1}.0`
        : `${major}.${minor}.${patch + 1}`;
  }
}

if (!/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(version)) {
  throw new Error(`Computed version ${version} is not semver`);
}

const outputs = {
  version,
  tag: `v${version}`,
  existing: String(existing),
  previous_tag: previousTag,
};

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(outputs)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n',
  );
} else {
  for (const [key, value] of Object.entries(outputs)) {
    console.log(`${key}=${value}`);
  }
}
