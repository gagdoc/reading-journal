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
  const candidates = buildQueryCandidates(normalized);
  let lastResponse = {
    books: [],
    status: "empty",
    message: "검색 결과가 없습니다. 책 제목이나 ISBN을 조금 더 정확하게 입력해 보세요.",
  };

  for (const candidate of candidates) {
    lastResponse = await fetchBooks(candidate, limit);
    if (lastResponse.books.length) {
      return lastResponse;
    }
  }

  const fallbackResponse = await fetchOpenLibraryBooks(normalized, limit);
  if (fallbackResponse.books.length) {
    return fallbackResponse;
  }

  const googleResponse = await fetchGoogleBooks(normalized, limit);
  if (googleResponse.books.length) {
    return googleResponse;
  }

  return lastResponse;
}

async function fetchBooks(query, limit) {
  const url = new URL("/api/books/search", window.location.origin);
  url.searchParams.set("q", query);
  url.searchParams.set("display", String(limit));
  url.searchParams.set("sort", "sim");

  try {
    const response = await fetch(url);
    const data = await readJsonResponse(response);

    if (!response.ok || !data) {
      return {
        books: [],
        status: "network",
        message: data?.error || "도서 검색을 불러오지 못했습니다.",
      };
    }

    const books = Array.isArray(data.items) ? data.items.map(normalizeNaverBook).filter(Boolean) : [];
    const filtered = prioritizeQueryMatch(books, query).slice(0, limit);

    return {
      books: filtered,
      status: filtered.length ? "found" : "empty",
      message: filtered.length
        ? `${filtered.length}권의 책을 찾았습니다.`
        : "검색 결과가 없습니다. 책 제목이나 ISBN을 조금 더 정확하게 입력해 보세요.",
    };
  } catch (error) {
    return {
      books: [],
      status: "network",
      message: error?.message || "도서 검색을 불러오지 못했습니다.",
    };
  }
}

async function readJsonResponse(response) {
  if (!response) return null;

  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (!bodyText.trim()) {
    return null;
  }

  if (!contentType.includes("application/json") && !contentType.includes("+json")) {
    return null;
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return null;
  }
}

async function fetchOpenLibraryBooks(query, limit) {
  const url = new URL("https://openlibrary.org/search.json");
  const compactIsbn = query.replace(/[\s-]/g, "");
  const looksLikeIsbn = /^[\dXx]{8,17}$/.test(compactIsbn);

  if (looksLikeIsbn) {
    url.searchParams.set("isbn", compactIsbn);
  } else {
    url.searchParams.set("q", query);
  }
  url.searchParams.set("limit", String(limit * 2));

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return {
        books: [],
        status: "network",
        message: "Open Library 책 검색을 불러오지 못했습니다.",
      };
    }

    const books = Array.isArray(data.docs) ? data.docs.map(normalizeOpenLibraryBook).filter(Boolean) : [];
    const filtered = prioritizeQueryMatch(books, query).slice(0, limit);

    return {
      books: filtered,
      status: filtered.length ? "found" : "empty",
      message: filtered.length
        ? `네이버 대신 Open Library에서 ${filtered.length}권을 찾았습니다.`
        : "검색 결과가 없습니다. 책 제목이나 ISBN을 조금 더 정확하게 입력해 보세요.",
    };
  } catch (error) {
    return {
      books: [],
      status: "network",
      message: error?.message || "Open Library 책 검색을 불러오지 못했습니다.",
    };
  }
}

async function fetchGoogleBooks(query, limit) {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  const compactIsbn = query.replace(/[\s-]/g, "");
  const looksLikeIsbn = /^[\dXx]{8,17}$/.test(compactIsbn);

  if (looksLikeIsbn) {
    url.searchParams.set("q", `isbn:${compactIsbn}`);
  } else {
    url.searchParams.set("q", query);
  }
  url.searchParams.set("maxResults", String(limit * 2));
  url.searchParams.set("printType", "books");
  url.searchParams.set("projection", "lite");

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return {
        books: [],
        status: "network",
        message: "Google Books 책 검색을 불러오지 못했습니다.",
      };
    }

    const books = Array.isArray(data.items) ? data.items.map(normalizeGoogleBook).filter(Boolean) : [];
    const filtered = prioritizeQueryMatch(books, query).slice(0, limit);

    return {
      books: filtered,
      status: filtered.length ? "found" : "empty",
      message: filtered.length
        ? `Google Books에서 ${filtered.length}권을 찾았습니다.`
        : "검색 결과가 없습니다. 책 제목이나 ISBN을 조금 더 정확하게 입력해 보세요.",
    };
  } catch (error) {
    return {
      books: [],
      status: "network",
      message: error?.message || "Google Books 책 검색을 불러오지 못했습니다.",
    };
  }
}

function buildQueryCandidates(query) {
  const candidates = [query];
  const compactQuery = query.replace(/[\s-]+/g, "");
  if (compactQuery && compactQuery !== query) {
    candidates.push(compactQuery);
  }

  const strippedQuery = query.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  if (strippedQuery && strippedQuery !== query) {
    candidates.push(strippedQuery);
  }

  return [...new Set(candidates)];
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
    priceStandard: normalizePrice(item.price || item.priceStandard || ""),
    priceSales: normalizePrice(item.discount || item.priceSales || ""),
    note: "Naver Book Search result",
  };
}

function normalizeOpenLibraryBook(item) {
  if (!item) return null;

  const title = stripHtml(item.title || "");
  const authors = Array.isArray(item.author_name)
    ? item.author_name.map((part) => stripHtml(part).trim()).filter(Boolean)
    : [];
  const isbn = Array.isArray(item.isbn) ? item.isbn.find(Boolean) || "" : "";
  const cover = item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : "";

  return {
    source: "openlibrary",
    title,
    authors,
    publishYear: item.first_publish_year ? String(item.first_publish_year) : "",
    cover,
    isbn,
    sourceUrl: item.key ? `https://openlibrary.org${item.key}` : "",
    publisher: Array.isArray(item.publisher) ? stripHtml(item.publisher[0] || "") : "",
    priceStandard: "",
    priceSales: "",
    note: "Open Library search result",
  };
}

function normalizeGoogleBook(item) {
  if (!item?.volumeInfo) return null;

  const info = item.volumeInfo;
  const identifier = Array.isArray(info.industryIdentifiers)
    ? info.industryIdentifiers.find((entry) => entry?.identifier)?.identifier || ""
    : "";
  const cover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "";

  return {
    source: "google-books",
    title: stripHtml(info.title || ""),
    authors: Array.isArray(info.authors) ? info.authors.map((part) => stripHtml(part).trim()).filter(Boolean) : [],
    publishYear: info.publishedDate ? String(info.publishedDate).slice(0, 4) : "",
    cover,
    isbn: identifier,
    sourceUrl: info.infoLink || "",
    publisher: stripHtml(info.publisher || ""),
    priceStandard: "",
    priceSales: "",
    note: "Google Books search result",
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

function normalizePrice(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return "";

  return Number(digits).toLocaleString("ko-KR");
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
