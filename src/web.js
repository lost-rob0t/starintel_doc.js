const { Document, missingField } = require("./documents");

class Breach extends Document {
    constructor(data) {
        super(data);
        this.total = data.total || 0;
        this.description = data.description || "";
        this.url = data.url || "";
    }
}

class Email extends Document {
    constructor(data) {
        super(data);
        this.user = data.user || missingField("user");
        this.domain = data.domain || missingField("domain");
        this.password = data.password || "";
    }
}

class EmailMessage extends Document {
    constructor(data) {
        super(data);
        this.body = data.body || "";
        this.subject = data.subject || "";
        this.to = data.to || missingField("to");
        this.from = data.from || missingField("from");
        this.headers = data.headers || "";
        this.cc = data.cc || [];
        this.bcc = data.bcc || [];
    }
}

class User extends Document {
    constructor(data) {
        super(data);
        this.url = data.url || "";
        this.name = data.name || "";
        this.platform = data.platform || "";
        this.misc = data.misc || [];
        this.bio = data.bio || "";
    }
}

Email.prototype.setId = function () {
    this.hashId(this.user, this.domain, this.password ? this.password : "");
};

User.prototype.setId = function () {
    this.hashId(this.name, this.url, this.platform);
};

EmailMessage.prototype.setId = function () {
    this.hashId(this.body, this.to, this.from, this.subject);
};

function newEmail(dataset, ...args) {
    const email = new Email(...args);
    email.setMeta(dataset);
    return email;
}

function newEmailMessage(dataset, ...args) {
    const emailMessage = new EmailMessage(...args);
    emailMessage.setMeta(dataset);
    return emailMessage;
}

function newUser(dataset, ...args) {
    const user = new User(...args);
    user.setId();
    user.setMeta(dataset);
    return user;
}

module.exports = {
    Document,
    Breach,
    Email,
    EmailMessage,
    User,
    newEmail,
    newEmailMessage,
    newUser,
};
