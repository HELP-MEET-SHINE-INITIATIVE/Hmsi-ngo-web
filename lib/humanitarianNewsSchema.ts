export const humanitarianNewsSchema = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          summary: { type: 'string' },
          body: { type: 'string' },
          category: { type: 'string' },
          region: { type: 'string' },
          source_name: { type: 'string' },
          source_url: { type: 'string' },
          source_urls: { type: 'array', items: { type: 'string' } },
          source_published_at: { type: ['string', 'null'] },
          verification_status: { type: 'string', enum: ['candidate', 'source_checked'] },
          verification_notes: { type: 'string' },
          verified_source_count: { type: 'integer' },
        },
        required: ['headline', 'summary', 'body', 'category', 'region', 'source_name', 'source_url', 'source_urls', 'source_published_at', 'verification_status', 'verification_notes', 'verified_source_count'],
        additionalProperties: false,
      },
    },
  },
  required: ['candidates'],
  additionalProperties: false,
} as const;
