import { describe, expect, it } from 'vitest';
import { fieldStories, programmes } from '../lib/seoContent';

type DatedContent = {
  slug: string;
  publishedAt?: unknown;
  updatedAt?: unknown;
};

/**
 * Requires a canonical UTC ISO 8601 timestamp such as:
 * 2026-11-26T12:00:00.000Z
 *
 * Date.parse() alone is intentionally not enough because it accepts values
 * that are parseable but not consistently serialized or explicitly UTC.
 */
const ISO_UTC_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function expectWellFormedIsoDate(value: unknown, fieldName: string, slug: string): asserts value is string {
  expect(value, `${fieldName} is required for ${slug}`).toEqual(expect.any(String));
  expect(value, `${fieldName} must use canonical UTC ISO 8601 format for ${slug}`).toMatch(
    ISO_UTC_DATE_PATTERN,
  );

  const date = new Date(value as string);
  expect(date.getTime(), `${fieldName} must represent a valid date for ${slug}`).not.toBeNaN();
  expect(date.toISOString(), `${fieldName} must round-trip without changing for ${slug}`).toBe(value);
}

function expectUniqueSlugs(records: DatedContent[], collectionName: string) {
  const slugs = records.map((record) => record.slug);
  expect(slugs, `${collectionName} must not be empty`).not.toHaveLength(0);
  expect(new Set(slugs).size, `${collectionName} slugs must be unique`).toBe(slugs.length);
  expect(slugs.every((slug) => typeof slug === 'string' && slug.trim().length > 0)).toBe(true);
}

function expectDatedContent(records: DatedContent[], collectionName: string) {
  expectUniqueSlugs(records, collectionName);

  for (const record of records) {
    expectWellFormedIsoDate(record.publishedAt, 'publishedAt', record.slug);

    if (record.updatedAt !== undefined) {
      expectWellFormedIsoDate(record.updatedAt, 'updatedAt', record.slug);

      expect(
        new Date(record.updatedAt).getTime(),
        `updatedAt must not precede publishedAt for ${record.slug}`,
      ).toBeGreaterThanOrEqual(new Date(record.publishedAt).getTime());
    }
  }
}

describe('static SEO content publication dates', () => {
  it('has a valid publication date for every programme', () => {
    expectDatedContent(programmes, 'programmes');
  });

  it('has a valid publication date for every field story', () => {
    expectDatedContent(fieldStories, 'field stories');
  });

  it('does not reuse an accidental invalid or runtime-generated date value', () => {
    const records = [...programmes, ...fieldStories] as DatedContent[];

    for (const record of records) {
      expect(record.publishedAt).not.toBe('');
      expect(record.publishedAt).not.toBeNull();
      expect(record.publishedAt).not.toBeUndefined();
      expect(record.publishedAt).not.toEqual(expect.stringMatching(/now\(|Date\(/));
    }
  });
});
