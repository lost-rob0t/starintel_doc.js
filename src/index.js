const Document = require('./documents').Document;
const entities = require('./entities');
const hosts = require('./hosts');
const locations = require('./locations');
const relations = require('./relations');
const targets = require('./targets');
const web = require('./web');
const phones = require('./phones');
const socialMedia = require('./social_media');

module.exports = {
  Document,
  ...entities,
  ...hosts,
  ...locations,
  ...relations,
  ...targets,
  ...web,
  ...phones,
  ...socialMedia
};
