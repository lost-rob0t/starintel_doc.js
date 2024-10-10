const { Document, missingField } = require("./documents");

class Relation extends Document {
    constructor(data) {
        super(data);
        this.source = data.source || missingField("source");
        this.target = data.target || missingField("target");
        this.note = data.note || missingField("note");
    }
}

Relation.prototype.setId = function () {
    this.ulidId();
};

function newRelation(dataset, source, target, note) {
    const relation = new Relation(source, target, note);
    relation.setMeta(dataset);
    return relation;
}

module.exports = {
    Document,
    Relation,
    newRelation,
};
