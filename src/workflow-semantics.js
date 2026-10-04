// Port of the locked StarLang workflow_semantics.py reference, after structural validation.
function validateWorkflowSemantics(document) {
  if (document.dtype !== "dataset-manifest") return;
  const keys = (document.countsByDtype || []).map(entry => entry.key);
  if (new Set(keys).size !== keys.length) {
    throw new TypeError("$.countsByDtype: duplicate original map key");
  }
}
module.exports = { validateWorkflowSemantics };
