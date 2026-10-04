module.exports = {
  ...require("./canonical"),
  // Historical wire formats are selected explicitly, never relabeled 0.10.1.
  legacy: require("./legacy"),
};
