// Port of the locked StarLang operation_semantics.py reference. No wire schema lives here.
function unique(items, key, path) {
  const values = new Set();
  for (const [index, item] of items.entries()) {
    const value = String(item[key] || "").trim();
    if (!value) throw new TypeError(`${path}[${index}].${key}: non-empty identifier required`);
    if (values.has(value)) throw new TypeError(`${path}[${index}].${key}: duplicate identifier ${value}`);
    values.add(value);
  }
  return values;
}
function refs(values, known, path) {
  for (const value of values) if (!known.has(value)) throw new TypeError(`${path}: unknown reference ${value}`);
}
function validateOperationSemantics(document) {
  if (document.dtype !== "operation") return;
  if (typeof document.mission !== "string" || !document.mission.trim()) throw new TypeError("$.mission: non-empty mission required");
  const phases = document.phases || [];
  if (!phases.length) throw new TypeError("$.phases: at least one phase required");
  const datasets = document.datasets || [], capabilities = document.capabilityGaps || [];
  const assignments = document.assignments || [], actions = document.postActions || [];
  const phaseIds = unique(phases, "phaseId", "$.phases");
  const datasetIds = unique(datasets, "bindingId", "$.datasets");
  const capabilityIds = unique(capabilities, "capabilityId", "$.capabilityGaps");
  unique(assignments, "assignmentId", "$.assignments");
  unique(actions, "actionId", "$.postActions");
  const graph = new Map(phases.map(phase => [phase.phaseId.trim(), phase.dependsOn || []]));
  for (const [id, dependencies] of graph) {
    refs(dependencies, phaseIds, `$.phases[${id}].dependsOn`);
    if (dependencies.includes(id)) throw new TypeError(`$.phases[${id}].dependsOn: self dependency`);
  }
  // Iterative DFS prevents a hostile deep phase chain from exhausting the JS stack.
  const visited = new Set(), visiting = new Set();
  for (const root of phaseIds) {
    const stack = [[root, false]];
    while (stack.length) {
      const [id, leaving] = stack.pop();
      if (leaving) { visiting.delete(id); visited.add(id); continue; }
      if (visiting.has(id)) throw new TypeError(`$.phases: dependency cycle reaches ${id}`);
      if (visited.has(id)) continue;
      visiting.add(id);
      stack.push([id, true]);
      for (const dependency of graph.get(id)) stack.push([dependency, false]);
    }
  }
  const excluded = new Set(document.outOfScope || []);
  for (const phase of phases) {
    const id = phase.phaseId.trim();
    if (typeof phase.objective !== "string" || !phase.objective.trim()) throw new TypeError(`$.phases[${id}].objective: non-empty objective required`);
    refs(phase.datasetBindingIds || [], datasetIds, `$.phases[${id}].datasetBindingIds`);
    refs(phase.requiredCapabilityIds || [], capabilityIds, `$.phases[${id}].requiredCapabilityIds`);
    if ((phase.inScope || []).some(scope => excluded.has(scope))) throw new TypeError(`$.phases[${id}].inScope: operation outOfScope overrides phase scope`);
    if (phase.state === "completed" && !(phase.completionEvidence || []).length) throw new TypeError(`$.phases[${id}].completionEvidence: completed phase requires evidence`);
  }
  for (const item of datasets) refs(item.phases || [], phaseIds, `$.datasets[${item.bindingId}].phases`);
  for (const item of capabilities) refs(item.requiredBy || [], phaseIds, `$.capabilityGaps[${item.capabilityId}].requiredBy`);
  for (const item of assignments) refs(item.phaseIds || [], phaseIds, `$.assignments[${item.assignmentId}].phaseIds`);
  for (const item of actions) refs(item.datasetBindingIds || [], datasetIds, `$.postActions[${item.actionId}].datasetBindingIds`);
  if (document.status === "completed" && phases.some(phase => !["completed", "skipped"].includes(phase.state))) throw new TypeError("$.status: completed operation has nonterminal phases");
}
module.exports = { validateOperationSemantics };
