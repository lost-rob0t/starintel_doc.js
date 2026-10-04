// SDK-owned raw-text guard, shared by canonical and historical decoders.
// It observes keys only; each caller keeps its original number/reviver options.
function inspectJsonKeys(text) {
  // lossless-json permits duplicate keys when their values compare equal.
  // Reject all repeats before that information is erased. String tokens are
  // indivisible, so braces in strings cannot change the object-local scope.
  const keyTokens = [], keys = new Set(), scopes = [];
  for (const match of text.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]]/g)) {
    const token = match[0];
    if (token === "{" || token === "[") scopes.push(token === "{" ? new Set() : null);
    else if (token === "}" || token === "]") scopes.pop();
    else if (/^[ \t\r\n]*:/.test(text.slice(match.index + token.length))) {
      const key = JSON.parse(token), scope = scopes[scopes.length - 1];
      if (scope?.has(key)) throw new SyntaxError(`Duplicate key: ${JSON.stringify(key)}`);
      scope?.add(key);
      keys.add(key);
      keyTokens.push(match);
    }
  }
  return { keyTokens, keys };
}

module.exports = { inspectJsonKeys };
