const AVAILABLE_OPTIONS_CONFIG = Object.freeze({
  // Search URL only with the specified term.
  u: { requiredArgument: true },
  // Search Title only with the specified term.
  t: { requiredArgument: true, greedyArgument: false }, // greedyArgument: whether to allow unquoted multi-word arguments. Implemented but decided not to use for this option.
  // Use Regular Expression for search terms.
  r: { requiredArgument: false },
  // Show help message.
  h: { requiredArgument: false },
  // Filter by date.
  d: { requiredArgument: true },
  // Filter bookmarks by folder path.
  f: { requiredArgument: true, command: "b" },
  // Set maximum results for history search. (History search only)
  m: { requiredArgument: true, command: "h" },
});

function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    while (i < input.length && /\s/.test(input[i])) {
      i++;
    }
    if (i === input.length) break;

    let tokenEnd = i;
    let currentToken = "";

    if (input[i] === '"' || input[i] === "'") {
      const quoteChar = input[i];
      tokenEnd = i + 1; // Move past the opening quote
      currentToken = ""; // Do not include the quote character itself
      while (tokenEnd < input.length) {
        if (input[tokenEnd] === "\\" && tokenEnd + 1 < input.length) {
          // Handle escaped characters
          currentToken += input[tokenEnd + 1];
          tokenEnd += 2;
        } else if (input[tokenEnd] === quoteChar) {
          tokenEnd++;
          break;
        } else {
          currentToken += input[tokenEnd];
          tokenEnd++;
        }
      }
      // If the quote is not closed, tokenEnd might become input.length.
      // In that case, the string up to that point is considered the token.
      tokens.push(currentToken);
    } else {
      while (tokenEnd < input.length && !/\s/.test(input[tokenEnd])) {
        tokenEnd++;
      }
      currentToken = input.substring(i, tokenEnd);
      tokens.push(currentToken);
    }
    i = tokenEnd;
  }
  return tokens;
}

function getValidOptionConfiguration(optionKey, currentCommand) {
  const config = AVAILABLE_OPTIONS_CONFIG[optionKey];
  if (!config) {
    return null;
  }
  if (config.command === undefined || config.command === currentCommand) {
    return config;
  }
  return null;
}

function parseTextOption(text, useRegExp) {
  if (!text) return null;
  if (!useRegExp) return text;
  try {
    return new RegExp(text, "i");
  } catch (e) {
    throw new Error(`Invalid regular expression: ${text}`);
  }
}

function parseMaxResults(maxResults) {
  if (!maxResults) return null;
  const num = parseInt(maxResults, 10);
  if (!isNaN(num) && num > 0) {
    return num;
  } else {
    throw new Error(
      `Option -m requires a positive number argument. Received: "${maxResults}".`
    );
  }
}

function parseDateOption(dateStr) {
  if (!dateStr) return null;
  let startDate, endDate;
  // Matches YYYY-MM-DD or YYYY/MM/DD. Allows 1 or 2 digits for month/day.
  // Ensures the entire string is a date.
  const singleDatePattern = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;

  try {
    // Attempt to parse as a range first: YYYY-MM-DD1-YYYY-MM-DD2
    const rangePattern =
      /^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})-(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})$/;
    const rangeMatch = dateStr.match(rangePattern);

    if (rangeMatch) {
      const dateStr1 = rangeMatch[1]; // First date string e.g., "2023-01-01"
      const dateStr2 = rangeMatch[2]; // Second date string e.g., "2023-01-31"

      const dStart = new Date(dateStr1.replace(/-/g, "/"));
      const dEnd = new Date(dateStr2.replace(/-/g, "/"));

      if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) {
        throw new Error(
          `Invalid date values in range: "${dateStr1}" or "${dateStr2}".`
        );
      }

      startDate = new Date(
        dStart.getFullYear(),
        dStart.getMonth(),
        dStart.getDate()
      ).getTime();

      // Set endDate to the start of the day *after* dEnd
      const tempEnd = new Date(
        dEnd.getFullYear(),
        dEnd.getMonth(),
        dEnd.getDate()
      );
      tempEnd.setDate(tempEnd.getDate() + 1);
      endDate = tempEnd.getTime();

      if (endDate < startDate) {
        throw new Error("End date in range cannot be before start date.");
      }
    }
    // Then, check for -YYYY-MM-DD (before or on date)
    else if (
      dateStr.startsWith("-") &&
      singleDatePattern.test(dateStr.substring(1))
    ) {
      const d = new Date(dateStr.substring(1).replace(/-/g, "/"));
      if (isNaN(d.getTime())) throw new Error("Invalid date value after '-'.");
      // startDate remains undefined (search from beginning of time)
      // Set endDate to the start of the day *after* d
      const tempEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      tempEnd.setDate(tempEnd.getDate() + 1);
      endDate = tempEnd.getTime();
    }
    // Then, check for YYYY-MM-DD- (on or after date)
    else if (
      dateStr.endsWith("-") &&
      singleDatePattern.test(dateStr.slice(0, -1))
    ) {
      const d = new Date(dateStr.slice(0, -1).replace(/-/g, "/"));
      if (isNaN(d.getTime())) throw new Error("Invalid date value before '-'.");
      startDate = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
      ).getTime();
      // endDate remains undefined (search up to now)
    }
    // Finally, check for a single date YYYY-MM-DD
    else if (singleDatePattern.test(dateStr)) {
      const d = new Date(dateStr.replace(/-/g, "/"));
      if (isNaN(d.getTime())) throw new Error("Invalid date value.");
      startDate = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
      ).getTime();
      // Set endDate to the start of the day *after* d
      const tempEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      tempEnd.setDate(tempEnd.getDate() + 1);
      endDate = tempEnd.getTime();
    }
    // If none of the above matched
    else {
      throw new Error(
        `Unknown date format for -d option: "${dateStr}". Supported formats: YYYY-MM-DD, -YYYY-MM-DD, YYYY-MM-DD-, YYYY-MM-DD1-YYYY-MM-DD2.`
      );
    }
  } catch (e) {
    throw e;
  }
  return { startDate, endDate };
}

export function parseQuery(query) {
  let command = "b";
  let queryString = query.trim();

  if (queryString.toLowerCase().startsWith("b:")) {
    command = "b";
    queryString = queryString.substring(2).trim();
  } else if (queryString.toLowerCase().startsWith("h:")) {
    command = "h";
    queryString = queryString.substring(2).trim();
  }

  const parsedOptionsInternal = {};
  const remainingParts = [];

  if (queryString === "") {
    return { command, options: {}, searchTerm: "" };
  }

  const tokens = tokenize(queryString);

  let i = 0;
  while (i < tokens.length) {
    const currentToken = tokens[i];
    let wasConsumedAsOption = false;

    if (currentToken.startsWith("-") && currentToken.length > 1) {
      const optionKey = currentToken.substring(1);
      const optionConfig = getValidOptionConfiguration(optionKey, command);

      if (optionConfig) {
        if (!optionConfig.requiredArgument) {
          parsedOptionsInternal[optionKey] = true;
          i++;
          wasConsumedAsOption = true;
        } else {
          // optionConfig.requiredArgument must be true here
          if (i + 1 < tokens.length) {
            // Check if there's a next token
            if (optionConfig.greedyArgument) {
              const argumentTokens = [];
              let j = i + 1;
              while (j < tokens.length) {
                const nextPotentialArg = tokens[j];
                if (
                  nextPotentialArg.startsWith("-") &&
                  nextPotentialArg.length > 1 &&
                  getValidOptionConfiguration(
                    nextPotentialArg.substring(1),
                    command
                  )
                ) {
                  break;
                }
                argumentTokens.push(nextPotentialArg);
                j++;
              }

              if (argumentTokens.length > 0) {
                parsedOptionsInternal[optionKey] = argumentTokens.join(" ");
                i += argumentTokens.length + 1;
                wasConsumedAsOption = true;
              } else {
                // Argument was required (greedy), but no suitable token was found (either end of query or next token is another option).
                throw new Error(
                  `Option -${optionKey} requires an argument, but none was found or next token is another option.`
                );
              }
            } else {
              // Not greedy, takes a single argument.
              const potentialArgument = tokens[i + 1];
              let isNextTokenAnotherValidOption = false;
              if (
                potentialArgument.startsWith("-") &&
                potentialArgument.length > 1
              ) {
                if (
                  getValidOptionConfiguration(
                    potentialArgument.substring(1),
                    command
                  )
                ) {
                  isNextTokenAnotherValidOption = true;
                }
              }

              if (!isNextTokenAnotherValidOption) {
                parsedOptionsInternal[optionKey] = potentialArgument;
                i += 2;
                wasConsumedAsOption = true;
              } else {
                // Argument required, but the next token is another valid option.
                throw new Error(
                  `Option -${optionKey} requires an argument, but found another option '${potentialArgument}' instead.`
                );
              }
            }
          } else {
            // Argument required, but reached the end of the query.
            throw new Error(
              `Option -${optionKey} requires an argument, but reached end of query.`
            );
          }
        }
      } else {
        // Option not in AVAILABLE_OPTIONS_CONFIG or not valid for the current command.
        // Per current logic, this token will be treated as part of the searchTerm.
        // If strict option validation is needed, an error could be thrown here.
      }
    }

    if (!wasConsumedAsOption) {
      remainingParts.push(currentToken);
      i++;
    }
  }

  const useRegExp = !!parsedOptionsInternal["r"];

  const optionsResult = {
    titleSearchTerm: parseTextOption(parsedOptionsInternal["t"], useRegExp),
    urlSearchTerm: parseTextOption(parsedOptionsInternal["u"], useRegExp),
    regex: useRegExp,
    help: !!parsedOptionsInternal["h"],
    date: parseDateOption(parsedOptionsInternal["d"]),
    folder: parsedOptionsInternal["f"],
    maxResults: parseMaxResults(parsedOptionsInternal["m"]),
  };

  return {
    command: command,
    options: optionsResult,
    searchTerm: remainingParts.join(" "),
  };
}
