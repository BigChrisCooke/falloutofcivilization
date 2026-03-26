function readDollarQuoteTag(sql: string, index: number): string | null {
  if (sql[index] !== "$") {
    return null;
  }

  let cursor = index + 1;

  while (cursor < sql.length) {
    const char = sql[cursor];

    if (char === "$") {
      return sql.slice(index, cursor + 1);
    }

    if (char === undefined || !/[A-Za-z0-9_]/.test(char)) {
      return null;
    }

    cursor += 1;
  }

  return null;
}

export function convertQuestionPlaceholdersToPostgres(sql: string): string {
  let result = "";
  let placeholderIndex = 0;
  let cursor = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarQuoteTag: string | null = null;

  while (cursor < sql.length) {
    const current = sql[cursor];
    const next = sql[cursor + 1];

    if (current === undefined) {
      break;
    }

    if (dollarQuoteTag) {
      if (sql.startsWith(dollarQuoteTag, cursor)) {
        result += dollarQuoteTag;
        cursor += dollarQuoteTag.length;
        dollarQuoteTag = null;
        continue;
      }

      result += current;
      cursor += 1;
      continue;
    }

    if (inSingleQuote) {
      result += current;
      cursor += 1;

      if (current === "'" && next === "'") {
        result += next;
        cursor += 1;
        continue;
      }

      if (current === "'") {
        inSingleQuote = false;
      }

      continue;
    }

    if (inDoubleQuote) {
      result += current;
      cursor += 1;

      if (current === "\"" && next === "\"") {
        result += next;
        cursor += 1;
        continue;
      }

      if (current === "\"") {
        inDoubleQuote = false;
      }

      continue;
    }

    if (inLineComment) {
      result += current;
      cursor += 1;

      if (current === "\n") {
        inLineComment = false;
      }

      continue;
    }

    if (inBlockComment) {
      result += current;
      cursor += 1;

      if (current === "*" && next === "/") {
        result += next;
        cursor += 1;
        inBlockComment = false;
      }

      continue;
    }

    const maybeDollarQuoteTag = readDollarQuoteTag(sql, cursor);
    if (maybeDollarQuoteTag) {
      result += maybeDollarQuoteTag;
      cursor += maybeDollarQuoteTag.length;
      dollarQuoteTag = maybeDollarQuoteTag;
      continue;
    }

    if (current === "'" ) {
      inSingleQuote = true;
      result += current;
      cursor += 1;
      continue;
    }

    if (current === "\"") {
      inDoubleQuote = true;
      result += current;
      cursor += 1;
      continue;
    }

    if (current === "-" && next === "-") {
      inLineComment = true;
      result += current;
      result += next;
      cursor += 2;
      continue;
    }

    if (current === "/" && next === "*") {
      inBlockComment = true;
      result += current;
      result += next;
      cursor += 2;
      continue;
    }

    if (current === "?") {
      placeholderIndex += 1;
      result += `$${placeholderIndex}`;
      cursor += 1;
      continue;
    }

    result += current;
    cursor += 1;
  }

  return result;
}

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let cursor = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarQuoteTag: string | null = null;

  while (cursor < sql.length) {
    const char = sql[cursor];
    const next = sql[cursor + 1];

    if (char === undefined) {
      break;
    }

    if (dollarQuoteTag) {
      if (sql.startsWith(dollarQuoteTag, cursor)) {
        current += dollarQuoteTag;
        cursor += dollarQuoteTag.length;
        dollarQuoteTag = null;
        continue;
      }

      current += char;
      cursor += 1;
      continue;
    }

    if (inSingleQuote) {
      current += char;
      cursor += 1;

      if (char === "'" && next === "'") {
        current += next;
        cursor += 1;
        continue;
      }

      if (char === "'") {
        inSingleQuote = false;
      }

      continue;
    }

    if (inDoubleQuote) {
      current += char;
      cursor += 1;

      if (char === "\"" && next === "\"") {
        current += next;
        cursor += 1;
        continue;
      }

      if (char === "\"") {
        inDoubleQuote = false;
      }

      continue;
    }

    if (inLineComment) {
      current += char;
      cursor += 1;

      if (char === "\n") {
        inLineComment = false;
      }

      continue;
    }

    if (inBlockComment) {
      current += char;
      cursor += 1;

      if (char === "*" && next === "/") {
        current += next;
        cursor += 1;
        inBlockComment = false;
      }

      continue;
    }

    const maybeDollarQuoteTag = readDollarQuoteTag(sql, cursor);
    if (maybeDollarQuoteTag) {
      current += maybeDollarQuoteTag;
      cursor += maybeDollarQuoteTag.length;
      dollarQuoteTag = maybeDollarQuoteTag;
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      current += char;
      cursor += 1;
      continue;
    }

    if (char === "\"") {
      inDoubleQuote = true;
      current += char;
      cursor += 1;
      continue;
    }

    if (char === "-" && next === "-") {
      inLineComment = true;
      current += char;
      current += next;
      cursor += 2;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      current += char;
      current += next;
      cursor += 2;
      continue;
    }

    if (char === ";") {
      const statement = current.trim();
      if (statement.length > 0) {
        statements.push(statement);
      }

      current = "";
      cursor += 1;
      continue;
    }

    current += char;
    cursor += 1;
  }

  const trailingStatement = current.trim();
  if (trailingStatement.length > 0) {
    statements.push(trailingStatement);
  }

  return statements;
}
