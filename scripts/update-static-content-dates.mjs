#!/usr/bin/env node

/**
 * Keep static programme and field-story updatedAt values synchronized with
 * meaningful content changes in lib/seoContent.ts.
 *
 * First-time setup:
 *   node scripts/update-static-content-dates.mjs
 *
 * Normal update:
 *   node scripts/update-static-content-dates.mjs
 *
 * CI validation without modifying files:
 *   node scripts/update-static-content-dates.mjs --check
 *
 * Preview changes without writing files:
 *   node scripts/update-static-content-dates.mjs --dry-run
 *
 * The manifest must be committed. It records content fingerprints, while the
 * source file remains the source of truth for publication and update dates.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const SOURCE_PATH = path.join(ROOT, 'lib', 'seoContent.ts');
const MANIFEST_PATH = path.join(ROOT, '.content-date-manifest.json');

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check');
const DRY_RUN = args.has('--dry-run');
const DATE_ARGUMENT_INDEX = process.argv.indexOf('--date');
const PROVIDED_DATE = DATE_ARGUMENT_INDEX === -1 ? undefined : process.argv[DATE_ARGUMENT_INDEX + 1];

if (CHECK_ONLY && DRY_RUN) {
  console.error('Use either --check or --dry-run, not both.');
  process.exit(2);
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse ${path.relative(ROOT, filePath)}: ${error.message}`);
  }
}

function getUpdateDate() {
  const value = PROVIDED_DATE || process.env.CONTENT_UPDATE_DATE || new Date().toISOString();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new Error(`Update date must be canonical UTC ISO format, received: ${value}`);
  }
  if (new Date(value).toISOString() !== value) {
    throw new Error(`Update date is not a valid ISO timestamp: ${value}`);
  }
  return value;
}

function getCollection(source, exportName) {
  const marker = `export const ${exportName}`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Could not find ${marker} in ${path.relative(ROOT, SOURCE_PATH)}`);

  const end = source.indexOf('\n];', start);
  if (end === -1) throw new Error(`Could not find the end of ${exportName}`);
  return { start, end: end + 3, text: source.slice(start, end + 3) };
}

function getRecords(collectionText) {
  const records = [];
  const recordPattern = /^  \{[\s\S]*?^  \},?$/gm;
  let match;

  while ((match = recordPattern.exec(collectionText)) !== null) {
    const text = match[0];
    const slugMatch = text.match(/^    slug: '([^']+)',$/m);
    if (!slugMatch) continue;
    records.push({ slug: slugMatch[1], text });
  }

  if (records.length === 0) throw new Error('No top-level content records were found.');
  return records;
}

function contentFingerprint(recordText) {
  const contentOnly = recordText
    .replace(/^    publishedAt: [^\n]+\n/m, '')
    .replace(/^    updatedAt: [^\n]+\n/m, '')
    .replace(/\r\n/g, '\n')
    .trim();

  return crypto.createHash('sha256').update(contentOnly, 'utf8').digest('hex');
}

function replaceRecord(source, slug, replacement) {
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const recordPattern = new RegExp(`(^  \\{[\\s\\S]*?^    slug: '${escapedSlug}',[\\s\\S]*?^  \\},?)`, 'm');
  if (!recordPattern.test(source)) throw new Error(`Could not replace record ${slug}`);
  return source.replace(recordPattern, replacement);
}

function setUpdatedAt(recordText, updatedAt, slug) {
  const updatedPattern = /^    updatedAt: [^\n]+$/m;
  if (!updatedPattern.test(recordText)) {
    throw new Error(`Record ${slug} is missing an updatedAt field.`);
  }
  return recordText.replace(updatedPattern, `    updatedAt: '${updatedAt}',`);
}

const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const manifest = readJsonIfPresent(MANIFEST_PATH);
const nextManifest = {
  version: 1,
  source: 'lib/seoContent.ts',
  records: {},
};

const collections = [
  ['programmes', getCollection(source, 'programmes')],
  ['fieldStories', getCollection(source, 'fieldStories')],
];

let updatedSource = source;
let changedCount = 0;
let checkFailures = 0;

for (const [collectionName, collection] of collections) {
  const records = getRecords(collection.text);

  for (const record of records) {
    const fingerprint = contentFingerprint(record.text);
    const key = `${collectionName}:${record.slug}`;
    const previousFingerprint = manifest.records?.[key]?.fingerprint;
    const contentChanged = previousFingerprint !== undefined && previousFingerprint !== fingerprint;
    nextManifest.records[key] = { fingerprint };

    if (!contentChanged) continue;

    checkFailures += 1;
    changedCount += 1;
    const updatedAt = getUpdateDate();
    const replacement = setUpdatedAt(record.text, updatedAt, record.slug);
    updatedSource = replaceRecord(updatedSource, record.slug, replacement);
    console.log(`${CHECK_ONLY ? 'CHANGED' : DRY_RUN ? 'WOULD UPDATE' : 'UPDATED'} ${key} -> ${updatedAt}`);
  }
}

const manifestText = `${JSON.stringify(nextManifest, null, 2)}\n`;
const sourceChanged = updatedSource !== source;
const manifestChanged = JSON.stringify(manifest) !== JSON.stringify(nextManifest);

if (CHECK_ONLY) {
  if (checkFailures > 0) {
    console.error(`\n${checkFailures} content record(s) changed since the last fingerprint.`);
    console.error('Run the update script and commit both lib/seoContent.ts and .content-date-manifest.json.');
    process.exit(1);
  }
  console.log('Static content fingerprints are current.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log(`\nDry run complete: ${changedCount} content record(s) would be updated.`);
  process.exit(0);
}

if (sourceChanged) fs.writeFileSync(SOURCE_PATH, updatedSource);
if (manifestChanged || !fs.existsSync(MANIFEST_PATH)) fs.writeFileSync(MANIFEST_PATH, manifestText);

console.log(`\nContent date update complete: ${changedCount} record(s) updated.`);
console.log(`Manifest: ${path.relative(ROOT, MANIFEST_PATH)}`);
