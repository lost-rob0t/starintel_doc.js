const v090 = require("./v090");

const legacy = {
  Document: require("./documents").Document,
  ...require("./entities"),
  ...require("./hosts"),
  ...require("./locations"),
  ...require("./relations"),
  ...require("./targets"),
  ...require("./web"),
  ...require("./phones"),
  ...require("./social_media"),
};

module.exports = {
  ...v090,
  legacy,
};
