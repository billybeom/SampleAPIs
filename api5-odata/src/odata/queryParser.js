/**
 * OData 4.0 query option parser
 * Supports: $filter, $select, $orderby, $top, $skip, $count, $expand
 *
 * Filter operators supported:
 *   eq, ne, gt, ge, lt, le, and, or, not
 *   contains(field, 'value'), startswith(field, 'value'), endswith(field, 'value')
 */

/**
 * Parse a simple OData $filter expression into a JS predicate function.
 * Supports: eq, ne, gt, ge, lt, le, and, or, contains, startswith, endswith
 */
function parseFilter(filterStr) {
  if (!filterStr) return () => true;

  // Tokenize logical operators (and / or) — split top-level only (no nested parens support needed for samples)
  const orParts = splitTopLevel(filterStr, " or ");
  if (orParts.length > 1) {
    const fns = orParts.map(parseFilter);
    return (item) => fns.some((fn) => fn(item));
  }

  const andParts = splitTopLevel(filterStr, " and ");
  if (andParts.length > 1) {
    const fns = andParts.map(parseFilter);
    return (item) => fns.every((fn) => fn(item));
  }

  const expr = filterStr.trim();

  // contains(field, 'value')
  const containsMatch = expr.match(/^contains\((\w+),\s*'([^']*)'\)$/i);
  if (containsMatch) {
    const [, field, value] = containsMatch;
    return (item) => String(item[field] ?? "").toLowerCase().includes(value.toLowerCase());
  }

  // startswith(field, 'value')
  const startswithMatch = expr.match(/^startswith\((\w+),\s*'([^']*)'\)$/i);
  if (startswithMatch) {
    const [, field, value] = startswithMatch;
    return (item) => String(item[field] ?? "").toLowerCase().startsWith(value.toLowerCase());
  }

  // endswith(field, 'value')
  const endswithMatch = expr.match(/^endswith\((\w+),\s*'([^']*)'\)$/i);
  if (endswithMatch) {
    const [, field, value] = endswithMatch;
    return (item) => String(item[field] ?? "").toLowerCase().endsWith(value.toLowerCase());
  }

  // Binary comparison: field op value
  const binaryMatch = expr.match(/^(\w+)\s+(eq|ne|gt|ge|lt|le)\s+(.+)$/i);
  if (binaryMatch) {
    const [, field, op, rawValue] = binaryMatch;
    const value = parseODataValue(rawValue.trim());
    return (item) => {
      const actual = item[field];
      switch (op.toLowerCase()) {
        case "eq": return actual == value;  // loose for null/boolean
        case "ne": return actual != value;
        case "gt": return actual > value;
        case "ge": return actual >= value;
        case "lt": return actual < value;
        case "le": return actual <= value;
        default:   return true;
      }
    };
  }

  // Unrecognised expression — pass through
  return () => true;
}

/** Parse an OData literal value (string, number, boolean, null) */
function parseODataValue(raw) {
  if (raw === "null")  return null;
  if (raw === "true")  return true;
  if (raw === "false") return false;
  if (/^'.*'$/.test(raw)) return raw.slice(1, -1);
  const num = Number(raw);
  return isNaN(num) ? raw : num;
}

/** Split a string on a delimiter, but only at the top-level (not inside parentheses) */
function splitTopLevel(str, delimiter) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i <= str.length - delimiter.length; i++) {
    if (str[i] === "(") depth++;
    else if (str[i] === ")") depth--;
    else if (depth === 0 && str.slice(i, i + delimiter.length) === delimiter) {
      parts.push(str.slice(start, i));
      start = i + delimiter.length;
      i += delimiter.length - 1;
    }
  }
  parts.push(str.slice(start));
  return parts;
}

/**
 * Parse $orderby: "field asc|desc, field2 asc|desc"
 * Returns a comparator function.
 */
function parseOrderby(orderbyStr) {
  if (!orderbyStr) return null;
  const clauses = orderbyStr.split(",").map((s) => {
    const [field, dir = "asc"] = s.trim().split(/\s+/);
    return { field, asc: dir.toLowerCase() !== "desc" };
  });
  return (a, b) => {
    for (const { field, asc } of clauses) {
      if (a[field] < b[field]) return asc ? -1 : 1;
      if (a[field] > b[field]) return asc ? 1 : -1;
    }
    return 0;
  };
}

/**
 * Apply $select: project only requested fields
 * @param {object} item
 * @param {string[]} fields
 */
function applySelect(item, fields) {
  if (!fields || fields.length === 0) return item;
  const result = {};
  for (const f of fields) {
    if (f in item) result[f] = item[f];
  }
  return result;
}

/**
 * Parse and apply all OData system query options to a collection.
 *
 * @param {object[]} collection  - Source array
 * @param {object}   query       - req.query
 * @param {object}   [expandMap] - Map of expandable navigation property names → arrays to join
 * @returns {{ value: object[], count?: number }}
 */
function applyODataQuery(collection, query, expandMap = {}) {
  const {
    $filter,
    $orderby,
    $select,
    $top,
    $skip,
    $count,
    $expand,
  } = query;

  // 1. Filter
  let result = collection.filter(parseFilter($filter));

  // 2. Count (before paging)
  const totalCount = result.length;

  // 3. Order
  const comparator = parseOrderby($orderby);
  if (comparator) result = [...result].sort(comparator);

  // 4. Skip / Top (paging)
  const skipNum = parseInt($skip) || 0;
  const topNum  = parseInt($top)  || undefined;

  result = result.slice(skipNum, topNum !== undefined ? skipNum + topNum : undefined);

  // 5. Expand (simple navigation property injection)
  if ($expand && Object.keys(expandMap).length > 0) {
    const expandFields = $expand.split(",").map((s) => s.trim());
    result = result.map((item) => {
      const expanded = { ...item };
      for (const field of expandFields) {
        if (expandMap[field]) {
          expanded[field] = expandMap[field](item);
        }
      }
      return expanded;
    });
  }

  // 6. Select (field projection — applied after expand so expanded props can also be projected)
  const selectFields = $select ? $select.split(",").map((s) => s.trim()) : [];
  if (selectFields.length > 0) {
    result = result.map((item) => applySelect(item, selectFields));
  }

  const response = { value: result };
  if ($count === "true") response["@odata.count"] = totalCount;

  return response;
}

module.exports = { applyODataQuery, parseFilter, parseOrderby };
