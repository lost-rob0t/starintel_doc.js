const { Document, missingField } = require("./documents");

class Person extends Document {
    constructor(data) {
        super(data);
        this.fname = data.fname ?? missingField("fname");
        this.lname = data.lname ?? missingField("lname");
        this.mname = data.mname ?? "";
        this.bio = data.bio ?? "";
        this.dob = data.dob ?? "";
        this.race = data.race ?? "";
        this.region = data.region ?? "";
        this.misc = data.misc ?? [];
        this.etype = data.etype ?? "person";
        this.eid = data.eid ?? "";
    }
}
class Org extends Document {
    constructor(data) {
        super(data);
        this.name = data.name ?? missingField("name");
        this.reg = data.reg ?? "";
        this.bio = data.bio ?? "";
        this.country = data.country ?? "";
        this.website = data.website ?? "";
        this.etype = data.etype ?? "org";
        this.eid = data.eid ?? "";
    }
}

Person.prototype.setId = function () {
    this.ulidId();
};

Org.prototype.setId = function () {
    this.hashId(this.name, this.reg, this.country);
};

function newOrg(dataset, name, etype, ...args) {
    const org = new Org(name, ...args);
    org.setMeta(dataset);
    return org;
}

function newPerson(dataset, fname, lname, etype, ...args) {
    const person = new Person(fname, lname, ...args);
    person.setMeta(dataset);
    return person;
}
