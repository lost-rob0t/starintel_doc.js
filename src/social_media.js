const { Document, missingField } = require("./documents");

class Message extends Document {
  constructor(data) {
    super(data);
    this.content = data.content ?? missingField("content");
    this.platform = data.platform ?? missingField("platform");
    this.user = data.user ?? missingField("user");
    this.isReply = data.isReply ?? false;
    this.media = data.media ?? [];
    this.messageId = data.messageId ?? "";
    this.replyTo = data.replyTo ?? "";
    this.group = data.group ?? missingField("group");
    this.channel = data.channel ?? missingField("channel");
    this.mentions = data.mentions ?? [];
  }
}

class SocialMediaPost extends Document {
  constructor(data) {
    super(data);
    this.content = data.content ?? missingField("content");
    this.user = data.user ?? missingField("user");
    this.replies = data.replies ?? [];
    this.media = data.media ?? [];
    this.replyCount = data.replyCount ?? 0;
    this.repostCount = data.repostCount ?? 0;
    this.url = data.url ?? missingField("url");
    this.links = data.links ?? [];
    this.tags = data.tags ?? [];
    this.title = data.title ?? missingField("title");
    this.group = data.group ?? missingField("group");
    this.replyTo = data.replyTo ?? "";
  }
}

// Set ID for Message document
Message.prototype.setId = function () {
  this.hashId(
    this.content,
    this.user,
    this.channel,
    this.group,
    this.messageId,
    this.platform,
  );
};

// Set ID for SocialMediaPost document
SocialMediaPost.prototype.setId = function () {
  this.hashId(this.content, this.user, this.url, this.group);
};

// Function to create a new Message instance
function newMessage(dataset, ...args) {
  const message = new Message(...args);
  message.setMeta(dataset);
  return message;
}

// Function to create a new SocialMediaPost instance
function newSocialMediaPost(dataset, ...args) {
  const post = new SocialMediaPost(...args);
  post.setMeta(dataset);
  return post;
}

module.exports = {
  Document,
  Message,
  SocialMediaPost,
  newMessage,
  newSocialMediaPost,
};
