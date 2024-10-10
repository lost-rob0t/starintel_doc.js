const ULID = require("ulid");
const md5 = require("md5");

// I should likly use some other method to handle missing fields....
function missingField(fieldName) {
  throw new Error(`Invalid data: Missing required field '${fieldName}'.`);
}

const STARINTEL_VERSION = "0.7.3";

class Document {
  constructor(data) {
    this._id = data._id ?? null;
    this.dataset = data.dataset ?? "";
    this.dtype = data.dtype ?? "";
    this.sources = data.sources ?? [];
    this.version = data.version ?? STARINTEL_VERSION;
    this.dateUpdated = data.dateUpdated ?? this.unixNow();
    this.dateAdded = data.dateAdded ?? this.unixNow();
  }

  ulidId() {
    this._id = ULID.ulid();
  }

  unixNow() {
    return Math.floor(new Date().getTime() / 1000);
  }

  timestamp() {
    if (!this.dateAdded) {
      this.dateAdded = this.unixNow();
    }
    if (!this.dateUpdated) {
      this.dateUpdated = this.unixNow();
    }
  }

  updateTimestamp() {
    this.dateUpdated = this.unixNow();
  }

  hashId(...data) {
    this._id = md5(data.join(""));
  }

  setId() {
    if (!this._id || this._id.length === 0) {
      this.ulidId();
    }
  }

  setType() {
    const className = this.constructor.name;
    this.dtype = className.toLowerCase();
  }

  setMeta(dataset) {
    if (!this.dataset) {
      this.dataset = dataset;
    }
    this.setType();
    this.setId();
    this.timestamp();
  }

  static create(data, dataset = "starintel") {
    const newObj = new this(data);
    newObj.setMeta(dataset);
    return newObj;
  }
}

module.exports = { Document, missingField };
