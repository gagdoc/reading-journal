import { normalizeSearch } from "../lib/text.js";

export function createEntry(payload, book) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    title: book?.title || "",
    author: book?.authors?.[0] || "",
    isbn: book?.isbn || "",
    date: payload.date,
    rating: payload.rating,
    tags: payload.tags,
    notes: payload.notes.trim(),
    book,
  };
}

export function filterEntries(entries, searchTerm) {
  const term = normalizeSearch(searchTerm);
  if (!term) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.title,
      entry.author,
      entry.isbn,
      entry.notes,
      entry.date,
      ...(entry.tags || []),
      entry.book?.title,
      ...(entry.book?.authors || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}

export function getJournalStats(entries) {
  const uniqueBooks = new Set();
  let latestReadAt = "";

  for (const entry of entries) {
    const key = entry.isbn || (entry.title && entry.author ? `${entry.title}::${entry.author}` : "");
    if (key) uniqueBooks.add(key);

    if (!entry.date) continue;
    if (!latestReadAt || new Date(entry.date).getTime() > new Date(latestReadAt).getTime()) {
      latestReadAt = entry.date;
    }
  }

  return {
    totalEntries: entries.length,
    uniqueBooks: uniqueBooks.size,
    latestReadAt,
  };
}
