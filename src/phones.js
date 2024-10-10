const { Document, missingField } = require("./documents");

class Phone extends Document {
    constructor(data) {
        super(data);
        this.number = data.number ?? missingField("number");
        this.carrier = data.carrier ?? "";
        this.status = data.status ?? "";
        this.phoneType = data.phoneType ?? "";
    }
}

Phone.prototype.setId = function () {
    this.hashId(this.number);
};

function newPhone(dataset, ...args) {
    const phone = new Phone(...args);
    phone.setMeta(dataset);
    return phone;
}

module.exports = {
    Document,
    Phone,
    newPhone,
};
