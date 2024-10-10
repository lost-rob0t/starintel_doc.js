const { Document, missingField } = require("./documents");

class Geo extends Document {
    constructor(data) {
        super(data);
        this.lat = data.lat ?? 0.0;
        this.long = data.long ?? 0.0;
        this.alt = data.alt ?? 0.0;
    }

    setId() {
        this.hashId(this.lat, this.long, this.alt);
    }
}

class Address extends Geo {
    constructor(data) {
        super(data);
        this.city = data.city ?? missingField("city");
        this.state = data.state ?? missingField("state");
        this.postal = data.postal ?? missingField("postal");
        this.country = data.country ?? missingField("country");
        this.street = data.street ?? missingField("street");
        this.street2 = data.street2 ?? "";
    }

    setId() {
        this.hashId(
            this.lat,
            this.long,
            this.alt,
            this.city,
            this.state,
            this.postal,
            this.country,
            this.street,
            this.street2,
        );
    }
}
// Set ID for Geo document
Geo.prototype.setId = function () {
    this.hashId(this.lat, this.long, this.alt);
};

Address.prototype.setId = function () {
    this.hashId(
        this.lat,
        this.long,
        this.alt,
        this.city,
        this.state,
        this.postal,
        this.country,
        this.street,
        this.street2,
    );
};

function newGeo(dataset, data) {
    const geo = new Geo(data);
    geo.setMeta(dataset);
    return geo;
}

function newAddress(dataset, ...args) {
    const address = new Address(...args);
    address.setMeta(dataset);
    return address;
}

module.exports = {
    Document,
    Geo,
    Address,
    newGeo,
    newAddress,
};
