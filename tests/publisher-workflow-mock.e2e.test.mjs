import assert from 'node:assert/strict';
import test from 'node:test';

const PUBLISHER_ROLES = new Set([
  'Community Publisher',
  'Humanitarian Activist',
  'Independent Field Reporter',
]);

function createMockWorkflow() {
  const articles = [];
  let sequence = 0;
  const nextId = () => `mock-article-${++sequence}`;

  return {
    submit(identity, input) {
      if (identity.kind !== 'volunteer' || identity.status !== 'approved_active' || !PUBLISHER_ROLES.has(identity.publisherRole)) {
        throw new Error('PUBLISHER_ACCESS_REQUIRED');
      }
      if (!input.title.trim() || !input.content.trim()) throw new Error('TITLE_AND_CONTENT_REQUIRED');
      const article = {
        id: nextId(),
        title: input.title.trim(),
        excerpt: input.excerpt.trim(),
        content: input.content.trim(),
        category: input.category,
        authorName: identity.name,
        authorRole: identity.publisherRole,
        media: input.media ?? null,
        status: 'pending_editorial_review',
        submittedAt: new Date().toISOString(),
        revisionFeedback: null,
        reviewedBy: null,
        publishedAt: null,
      };
      articles.push(article);
      return structuredClone(article);
    },
    listQueue() {
      return articles.filter((article) => article.status !== 'published' && article.status !== 'rejected');
    },
    requestRevisions(admin, id, feedback) {
      if (admin.kind !== 'admin') throw new Error('ADMIN_REQUIRED');
      const article = articles.find((item) => item.id === id);
      if (!article) throw new Error('ARTICLE_NOT_FOUND');
      if (!feedback.trim()) throw new Error('REVISION_FEEDBACK_REQUIRED');
      article.status = 'revision_requested';
      article.revisionFeedback = feedback.trim();
      article.reviewedBy = admin.email;
      return structuredClone(article);
    },
    resubmit(identity, id, input) {
      if (identity.kind !== 'volunteer' || identity.status !== 'approved_active' || !PUBLISHER_ROLES.has(identity.publisherRole)) {
        throw new Error('PUBLISHER_ACCESS_REQUIRED');
      }
      const article = articles.find((item) => item.id === id);
      if (!article || article.authorName !== identity.name) throw new Error('ARTICLE_OWNER_REQUIRED');
      if (article.status !== 'revision_requested') throw new Error('REVISION_STATE_REQUIRED');
      article.title = input.title.trim();
      article.excerpt = input.excerpt.trim();
      article.content = input.content.trim();
      article.status = 'pending_editorial_review';
      article.revisionFeedback = null;
      article.submittedAt = new Date().toISOString();
      return structuredClone(article);
    },
    publish(admin, id, edits = {}) {
      if (admin.kind !== 'admin') throw new Error('ADMIN_REQUIRED');
      const article = articles.find((item) => item.id === id);
      if (!article) throw new Error('ARTICLE_NOT_FOUND');
      if (!['pending_editorial_review', 'revision_requested'].includes(article.status)) throw new Error('PUBLISH_STATE_REQUIRED');
      Object.assign(article, edits);
      article.status = 'published';
      article.reviewedBy = admin.email;
      article.publishedAt = new Date().toISOString();
      return structuredClone(article);
    },
    publicFeed() {
      return articles.filter((article) => article.status === 'published').map(({ id, title, content, authorName, authorRole, status }) => ({ id, title, content, authorName, authorRole, status }));
    },
  };
}

test('mock end-to-end publisher dispatch lifecycle reaches publication only after admin approval', () => {
  const workflow = createMockWorkflow();
  const publisher = { kind: 'volunteer', status: 'approved_active', name: 'Mock Field Reporter', publisherRole: 'Independent Field Reporter' };
  const admin = { kind: 'admin', email: 'mock-admin@example.invalid' };

  const submitted = workflow.submit(publisher, {
    title: 'Mock field update',
    excerpt: 'A disposable integration fixture.',
    content: 'This body exists only in memory for the integration test.',
    category: 'Field News',
    media: { imagePath: 'mock/photo.jpg', driveUrl: null },
  });
  assert.equal(submitted.status, 'pending_editorial_review');
  assert.equal(workflow.listQueue().length, 1);
  assert.equal(workflow.publicFeed().length, 0);

  const revisionRequested = workflow.requestRevisions(admin, submitted.id, 'Clarify the location and impact summary.');
  assert.equal(revisionRequested.status, 'revision_requested');
  assert.equal(revisionRequested.revisionFeedback, 'Clarify the location and impact summary.');

  const resubmitted = workflow.resubmit(publisher, submitted.id, {
    title: 'Mock field update — revised',
    excerpt: 'A revised disposable integration fixture.',
    content: 'The revised body remains in memory and is ready for human review.',
  });
  assert.equal(resubmitted.status, 'pending_editorial_review');
  assert.equal(workflow.publicFeed().length, 0);

  const published = workflow.publish(admin, submitted.id, { title: 'Mock field update — approved' });
  assert.equal(published.status, 'published');
  assert.equal(published.reviewedBy, admin.email);
  assert.ok(published.publishedAt);
  assert.deepEqual(workflow.publicFeed().map((article) => article.title), ['Mock field update — approved']);
  assert.equal(workflow.listQueue().length, 0);
});

test('mock authorization denies unapproved volunteers and non-admin publication', () => {
  const workflow = createMockWorkflow();
  const unapproved = { kind: 'volunteer', status: 'pending', name: 'Unapproved Fixture', publisherRole: 'Community Publisher' };
  assert.throws(() => workflow.submit(unapproved, { title: 'x', excerpt: '', content: 'y', category: 'Field News' }), /PUBLISHER_ACCESS_REQUIRED/);

  const publisher = { kind: 'volunteer', status: 'approved_active', name: 'Approved Fixture', publisherRole: 'Community Publisher' };
  const submitted = workflow.submit(publisher, { title: 'x', excerpt: '', content: 'y', category: 'Field News' });
  assert.throws(() => workflow.publish(publisher, submitted.id), /ADMIN_REQUIRED/);
  assert.equal(workflow.publicFeed().length, 0);
});

test('mock contributor attribution and media references remain scoped to the submitted article', () => {
  const workflow = createMockWorkflow();
  const publisher = { kind: 'volunteer', status: 'approved_active', name: 'Community Fixture', publisherRole: 'Community Publisher' };
  const article = workflow.submit(publisher, {
    title: 'Local impact fixture',
    excerpt: 'Fixture excerpt',
    content: 'Fixture content',
    category: 'Local Impact',
    media: { imagePath: 'mock/local-impact.jpg', driveUrl: 'https://drive.google.com/file/d/mock-fixture/view' },
  });
  assert.equal(article.authorName, 'Community Fixture');
  assert.equal(article.authorRole, 'Community Publisher');
  assert.deepEqual(article.media, { imagePath: 'mock/local-impact.jpg', driveUrl: 'https://drive.google.com/file/d/mock-fixture/view' });
  assert.equal(workflow.publicFeed().length, 0);
});
