export async function searchBooks(query, limit = 8) {
  const raw = String(query || "").trim();
  if (!raw) {
    return {
      books: [],
      status: "empty",
      message: "책 제목이나 ISBN을 입력해 주세요.",
    };
  }

  const normalized = raw.replace(/\s+/g, " ").trim();
  const url = new URL("/api/books/search", window.location.origin);
  url.searchParams.set("q", normalized);
  url.searchParams.set("display", String(limit));
  url.searchParams.set("sort", /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(normalized) ? "sim" : "sim");

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return {
        books: [],
        status: "network",
        message: data?.error || "네이버 책 검색을 불러오지 못했습니다.",
      };
    }

    const books = Array.isArray(data.items) ? data.items.map(normalizeNaverBook).filter(Boolean) : [];
    const filtered = prioritizeQueryMatch(books, normalized).slice(0, limit);

    return {
      books: filtered,
      status: filtered.length ? "found" : "empty",
      message: filtered.length ? `${filtered.length}개의 책을 찾았습니다.` : "검색 결과가 없습니다. 제목의 일부를 더 짧게 입력해 보세요.",
    };
  } catch (error) {
    return {
      books: [],
      status: "network",
      message: error?.message || "네이버 책 검색을 불러오지 못했습니다.",
    };
  }
}

function normalizeNaverBook(item) {
  if (!item) return null;

  const isbnText = String(item.isbn || "").trim();
  const isbns = isbnText.split(/\s+/).filter(Boolean);

  return {
    source: "naver",
    title: stripHtml(item.title || ""),
    authors: splitAuthors(item.author || ""),
    publishYear: item.pubdate ? formatDate(item.pubdate) : "",
    cover: item.image || "",
    isbn: isbns[1] || isbns[0] || "",
    sourceUrl: item.link || "",
    publisher: stripHtml(item.publisher || ""),
    note: "Naver Book Search result",
  };
}

function splitAuthors(authorText) {
  return String(authorText || "")
    .split("|")
    .map((part) => stripHtml(part).trim())
    .filter(Boolean);
}

function stripHtml(text) {
  return String(text || "").replace(/<[^>]*>/g, "");
}

function formatDate(value) {
  const text = String(value || "").trim();
  if (text.length !== 8) return text;
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function prioritizeQueryMatch(books, query) {
  const lower = query.toLowerCase();
  return [...books].sort((a, b) => {
    const aTitle = String(a.title || "").toLowerCase();
    const bTitle = String(b.title || "").toLowerCase();
    const aExact = aTitle.includes(lower) ? 1 : 0;
    const bExact = bTitle.includes(lower) ? 1 : 0;
    return bExact - aExact;
  });
}
