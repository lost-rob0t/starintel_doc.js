const { Document, missingField } = require("./documents");

class Target extends Document {
  constructor(data) {
    super(data);
    this.actor = data.actor ?? missingField("actor");
    this.target = data.target ?? missingField("target");
    this.delay = data.delay ?? 0;
    this.recurring = data.recurring ?? false;
    this.options = data.options ?? [];
  }
}

class Scope extends Document {
  constructor(data) {
    super(data);
    this.description = data.description ?? missingField("description");
    this.outScope = data.outScope ?? [];
    this.inScope = data.inScope ?? missingField("inScope");
    this.scopeType = data.scopeType ?? missingField("scopeType");
  }
}

// Set ID for Target document
Target.prototype.setId = function () {
  this.hashId(this.dataset, this.target, this.actor);
};

// Function to create a new Target instance
function newTarget(
  dataset,
  target,
  actor,
  { options = [], delay = 0, recurring = false } = {},
) {
  const targetObj = new Target(actor, target, delay, recurring, options);
  targetObj.setMeta(dataset);
  return targetObj;
}

// Method to add Scope object to Target options
function scopeAddToOptions(target, scope) {
  target.options.push(scope);
}

// Method to add item to Scope in-scope list
function addInScope(scope, thing) {
  scope.inScope.push(thing);
}

module.exports = {
  Document,
  Target,
  Scope,
  newTarget,
  scopeAddToOptions,
  addInScope,
};
