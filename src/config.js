export const STORAGE_KEYS = {
  entries: "reading-journal.entries",
  lastBook: "reading-journal.last-book",
  lastQuery: "reading-journal.last-query",
};

export const API_ENDPOINTS = {
  openLibrarySearch: (query) => `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`,
  openLibraryIsbn: (isbn) =>
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  openLibraryCover: (id) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`,
  googleBooksSearch: (query) =>
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&langRestrict=ko&printType=books`,
  placeholderCover: "https://via.placeholder.com/220x330?text=No+Cover",
};

export const STRINGS = {
  emptyEntries: "아직 저장된 독서 일기가 없습니다.",
  emptyPreview: "책을 먼저 검색한 뒤 선택해 주세요.",
  noSearchResult: "검색 결과가 없습니다. 제목의 일부를 더 짧게 입력해 보세요.",
};
