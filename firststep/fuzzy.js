/* FirstStep — lightweight fuzzy text matching for typo tolerance */

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

function allowedTypos(len) {
  if (len <= 4) return 1;
  if (len <= 7) return 2;
  return 3;
}

/** Typo-tolerant match of a query against a single candidate token. */
function tokenScore(q, token) {
  if (!token) return 0;
  if (token === q) return 1;
  if (token.startsWith(q)) return 0.95 - Math.min(0.15, (token.length - q.length) * 0.01);
  if (q.startsWith(token) && token.length >= 2) return 0.9 - Math.min(0.15, (q.length - token.length) * 0.01);

  // typo-tolerant prefix comparison: compare query against a same-length
  // slice of the token so a 1-2 char slip (Roos/Roaster, Kafe/Cafe) still hits.
  const prefix = token.slice(0, q.length);
  const dist = levenshtein(q, prefix);
  const budget = allowedTypos(q.length);
  if (dist <= budget) return 0.75 - dist * 0.15;
  return 0;
}

/**
 * Similarity score in [0,1]. 1 = identical (after normalization).
 * Rewards prefix matches and substring containment heavily, since
 * venue search is usually "starts with" or "contains" typing, but also
 * checks each word of the candidate independently so a typo in the
 * first word of a multi-word name (or vice versa) is still tolerated.
 */
export function similarity(query, candidate) {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (c === q) return 1;
  if (c.startsWith(q)) return 0.95 - Math.min(0.1, (c.length - q.length) * 0.005);
  if (c.includes(q)) return 0.85 - Math.min(0.1, (c.length - q.length) * 0.005);

  let best = 0;
  for (const tok of c.split(' ')) {
    best = Math.max(best, tokenScore(q, tok));
  }

  // also try the query as a whole against the full candidate (handles
  // typos that span a word boundary, e.g. "restoran" vs "restaurant")
  const wholeDist = levenshtein(q, c.slice(0, q.length + 2));
  const wholeBudget = allowedTypos(q.length) + 1;
  if (wholeDist <= wholeBudget) {
    best = Math.max(best, 0.7 - wholeDist * 0.12);
  }

  return Math.max(0, best);
}

export function normalizeText(s) {
  return normalize(s);
}
