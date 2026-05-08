const slugify = require('slugify');

const buildSlug = (value = '') => slugify(String(value), {
  lower: true,
  strict: true,
  trim: true
});

const stripHtml = (value = '') => String(value)
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const buildExcerpt = (value = '', maxLength = 300) => {
  const plainText = stripHtml(value);

  if (!plainText) {
    return '';
  }

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.substring(0, maxLength).trim()}...`;
};

const calculateReadingTime = (value = '', wordsPerMinute = 200) => {
  const plainText = stripHtml(value);

  if (!plainText) {
    return 0;
  }

  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

const syncSlugOnDocument = (document, sourceField) => {
  if (document.isModified('slug') && document.slug) {
    document.slug = buildSlug(document.slug);
    return;
  }

  if (document.isModified(sourceField) && !document.isModified('slug')) {
    document.slug = buildSlug(document[sourceField]);
  }
};

const getUpdateTarget = (update) => {
  if (!update) {
    return {};
  }

  if (update.$set && typeof update.$set === 'object') {
    return update.$set;
  }

  return update;
};

const syncSlugOnUpdate = (update, sourceField) => {
  const target = getUpdateTarget(update);

  if (Object.prototype.hasOwnProperty.call(target, 'slug') && target.slug) {
    target.slug = buildSlug(target.slug);
    return update;
  }

  if (Object.prototype.hasOwnProperty.call(target, sourceField) && target[sourceField]) {
    target.slug = buildSlug(target[sourceField]);
  }

  return update;
};

module.exports = {
  buildExcerpt,
  buildSlug,
  calculateReadingTime,
  getUpdateTarget,
  stripHtml,
  syncSlugOnDocument,
  syncSlugOnUpdate
};