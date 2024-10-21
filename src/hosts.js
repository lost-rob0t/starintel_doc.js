const { Document, missingField } = require("./documents");

class Domain extends Document {
  constructor(self, data) {
    super(data);
    this.recordType = data.recordType ?? "";
    this.record = data.record ?? "";
    this.resolvedAddresses = data.resolvedAddresses ?? "";
  }
}

class Service {
  constructor(data) {
    this.port = data.number || 0;
    this.name = data.name || "";
    this.ver = data.ver || "";
  }
}

class Network {
  constructor(data) {
    this.asn = data.number || 0;
    this.subnet = data.subnet || "";
    this.org = data.org || "";
  }
}

class Host extends Document {
  constructor(data) {
    super(data);
    this.hostname = data.hostname || "";
    this.ip = data.ip || "";
    // Array of <service>
    this.ports = data.ports || [];
    this.os = data.os || "";
  }
}

class URL extends Document {
  constructor(data) {
    super(data);
    this.url = data.url || "";
    this.path = data.path || "";
    this.content = data.content || "";
  }
}
//HACK Maybe We should also hash the resolved... becuase that allows you to track changes.
Domain.prototype.setId = function () {
  this.hashId(this.record, this.recordType);
};

Service.prototype.setId = function () {
  this.hashId(this.number, this.services);
};

Network.prototype.setId = function () {
  this.hashId(this.org, this.asn);
};

Host.prototype.setId = function () {
  this.hashId(this.ip);
};

URL.prototype.setId = function () {
  this.hashId(this.url, this.content);
};

function newDomain(dataset, ...args) {
  const domain = new Domain(...args);
  domain.setMeta(dataset);
  return domain;
}

function newService(dataset, ...args) {
  const service = new Service(...args);
  service.setMeta(dataset);
  return service;
}

function newNetwork(dataset, ...args) {
  const network = new Network(...args);
  network.setMeta(dataset);
  return network;
}

function newHost(dataset, ...args) {
  const host = new Host(...args);
  host.setMeta(dataset);
  return host;
}

function newURL(dataset, ...args) {
  const url = new URL(...args);
  url.setMeta(dataset);
  return url;
}

module.exports = {
  Document,
  Domain,
  Service,
  Network,
  Host,
  URL,
  newDomain,
  newService,
  newNetwork,
  newHost,
  newURL,
};
