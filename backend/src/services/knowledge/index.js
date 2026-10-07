// services/knowledge/index.js
const ingest = require('./ingest');
const search = require('./search');
const brandContext = require('./brandContext');
const { expandQuery, invalidateAll: invalidateExpandCache } = require('./queryExpander');

module.exports = {
  // write
  createDocument: ingest.createDocument,
  reindexDocument: ingest.reindexDocument,
  deleteDocument: ingest.deleteDocument,
  getDocument: ingest.getDocument,
  // read
  listDocuments: search.listDocuments,
  search: search.search,
  stats: search.stats,
  // AI context injection
  getBrandContext: brandContext.getBrandContext,
  buildQuery: brandContext.buildQuery,
  invalidateBrandContext: brandContext.invalidate,
  // advanced RAG
  expandQuery,
  invalidateExpandCache,
};