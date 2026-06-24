import { STORAGE_KEYS } from "./config.js?v=7";
import { loadJSON, saveJSON } from "./lib/storage.js?v=7";
import { parseTags, escapeHtml } from "./lib/text.js?v=7";
import { formatKoreanDate, getTodayISO } from "./lib/date.js?v=7";
import { searchBooks } from "./services/naverBooks.js?v=8";
import { createEntry, filterEntries, getJournalStats } from "./state/journal.js?v=8";
import { renderEntries, renderSearchResults, renderSelectedBook } from "./ui/render.js?v=10";

if (document.readyState === "loading") {
  await new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", resolve, { once: true });
  });
}

const openComposerBtn = document.querySelector("#openComposerBtn");
const closeComposerBtn = document.querySelector("#closeComposerBtn");
const composerPanel = document.querySelector("#composerPanel");
const composerBackdrop = document.querySelector("#composerBackdrop");
const bookQueryInput = document.querySelector("#bookQuery");
const searchBtn = document.querySelector("#searchBtn");
const searchStatus = document.querySelector("#searchStatus");
const searchResults = document.querySelector("#searchResults");
const selectedBookView = document.querySelector("#selectedBookView");
const form = document.querySelector("#entryForm");
const ratingField = form.elements.rating;
const entryCount = document.querySelector("#entryCount");
const uniqueBookCount = document.querySelector("#uniqueBookCount");
const latestReadAt = document.querySelector("#latestReadAt");
const homeTotalCount = document.querySelector("#homeTotalCount");
const homeLatestRead = document.querySelector("#homeLatestRead");
const backupExportBtn = document.querySelector("#backupExportBtn");
const backupImportBtn = document.querySelector("#backupImportBtn");
const backupStatus = document.querySelector("#backupStatus");
const backupFileInput = document.querySelector("#backupFileInput");
const saveBtn = document.querySelector("#saveBtn");
const homeView = document.querySelector("#homeView");
const shelfView = document.querySelector("#shelfView");
const shelfList = document.querySelector("#shelfList");
const shelfStatus = document.querySelector("#shelfStatus");
const shelfPageInfo = document.querySelector("#shelfPageInfo");
const shelfSearchInput = document.querySelector("#shelfSearchInput");
const shelfSortSelect = document.querySelector("#shelfSortSelect");
const shelfTagSelect = document.querySelector("#shelfTagSelect");
const clearShelfFiltersBtn = document.querySelector("#clearShelfFiltersBtn");
const openTrendingBtn = document.querySelector("#openTrendingBtn");
const featuredBooksStatus = document.querySelector("#trendingBooksStatus");
const featuredBooksList = document.querySelector("#trendingBooksList");
const featuredBackdrop = document.querySelector("#featuredBackdrop");
const featuredPanel = document.querySelector("#featuredPanel");
const closeTrendingBtn = document.querySelector("#closeTrendingBtn");
const prevShelfBtn = document.querySelector("#prevShelfBtn");
const nextShelfBtn = document.querySelector("#nextShelfBtn");
const goShelfBtn = document.querySelector("#goShelfBtn");
const backHomeBtn = document.querySelector("#backHomeBtn");
const backHomeFooterBtn = document.querySelector("#backHomeFooterBtn");
const detailBackdrop = document.querySelector("#detailBackdrop");
const detailPanel = document.querySelector("#detailPanel");
const detailTitle = document.querySelector("#detailTitle");
const detailAuthor = document.querySelector("#detailAuthor");
const detailMeta = document.querySelector("#detailMeta");
const detailInfo = document.querySelector("#detailInfo");
const detailTags = document.querySelector("#detailTags");
const detailNotes = document.querySelector("#detailNotes");
const detailCover = document.querySelector("#detailCover");
const detailEditBtn = document.querySelector("#detailEditBtn");
const detailCloseBtn = document.querySelector("#detailCloseBtn");
const detailDeleteBtn = document.querySelector("#detailDeleteBtn");
const ratingQuickButtons = document.querySelectorAll("[data-rating-button]");
const tagQuickButtons = document.querySelectorAll("[data-tag-chip]");

const SHELF_PAGE_SIZE = 10;

let entries = loadJSON(STORAGE_KEYS.entries, []);
let selectedBook = null;
let searchTimer = null;
let activeDetailEntryId = null;
let editingEntryId = null;
let composerOriginView = "home";
let pendingRevealEntryId = null;
let featuredBooks = [];
let featuredBooksLoading = false;
let shelfPage = 1;
let activeView = "home";
let shelfQuery = "";
let shelfSort = "latest";
let shelfTag = "all";

initialize();

openComposerBtn.addEventListener("click", openComposer);
closeComposerBtn.addEventListener("click", closeComposer);
composerBackdrop.addEventListener("click", closeComposer);
openTrendingBtn?.addEventListener("click", openTrendingPanel);
closeTrendingBtn?.addEventListener("click", closeTrendingPanel);
featuredBackdrop?.addEventListener("click", closeTrendingPanel);
goShelfBtn.addEventListener("click", () => setView(activeView === "shelf" ? "home" : "shelf"));
backHomeBtn.addEventListener("click", () => setView("home"));
backHomeFooterBtn?.addEventListener("click", () => setView("home"));
backupExportBtn?.addEventListener("click", exportBackup);
backupImportBtn?.addEventListener("click", () => backupFileInput?.click());
backupFileInput?.addEventListener("change", handleBackupImport);
detailBackdrop.addEventListener("click", closeDetail);
detailEditBtn?.addEventListener("click", openEditorForActiveEntry);
detailCloseBtn.addEventListener("click", closeDetail);
detailDeleteBtn.addEventListener("click", deleteActiveEntry);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (composerPanel && !composerPanel.hidden) {
    closeComposer();
    return;
  }
  if (detailPanel && !detailPanel.hidden) {
    closeDetail();
    return;
  }
  if (featuredPanel && !featuredPanel.hidden) {
    closeTrendingPanel();
    return;
  }
  if (activeView === "shelf") {
    setView("home");
  }
});
prevShelfBtn.addEventListener("click", () => {
  shelfPage = Math.max(1, shelfPage - 1);
  renderShelf();
});
nextShelfBtn.addEventListener("click", () => {
  const totalPages = getShelfTotalPages();
  shelfPage = Math.min(totalPages, shelfPage + 1);
  renderShelf();
});
shelfSearchInput?.addEventListener("input", (event) => {
  shelfQuery = event.target.value;
  shelfPage = 1;
  renderShelf();
});
shelfSortSelect?.addEventListener("change", (event) => {
  shelfSort = event.target.value;
  shelfPage = 1;
  renderShelf();
});
shelfTagSelect?.addEventListener("change", (event) => {
  shelfTag = event.target.value;
  shelfPage = 1;
  renderShelf();
});
clearShelfFiltersBtn?.addEventListener("click", () => {
  shelfQuery = "";
  shelfSort = "latest";
  shelfTag = "all";
  if (shelfSearchInput) shelfSearchInput.value = "";
  if (shelfSortSelect) shelfSortSelect.value = "latest";
  if (shelfTagSelect) shelfTagSelect.value = "all";
  shelfPage = 1;
  renderShelf();
});

ratingQuickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setRatingValue(button.dataset.ratingValue || "");
  });
});

tagQuickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    toggleTagChip(button.dataset.tagChip || "");
  });
});

form.elements.tags?.addEventListener("input", syncTagButtons);

searchBtn.addEventListener("click", () => {
  triggerSearch(bookQueryInput.value);
});

bookQueryInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  saveJSON(STORAGE_KEYS.lastQuery, bookQueryInput.value);

  if (bookQueryInput.value.trim().length < 2) {
    setStatus("책 제목이나 ISBN을 2글자 이상 입력하면 관련 책을 보여줍니다.");
    renderSearchResults(searchResults, [], selectBook);
    return;
  }

  setStatus("책을 찾는 중...");
  searchTimer = setTimeout(() => triggerSearch(bookQueryInput.value), 350);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!selectedBook) {
    setStatus("먼저 책을 선택해 주세요.");
    return;
  }

  const isEditing = Boolean(editingEntryId);
  const payload = Object.fromEntries(new FormData(form).entries());
  const entryData = {
    date: payload.date,
    rating: payload.rating,
    tags: parseTags(payload.tags),
    notes: payload.notes,
  };

  if (editingEntryId) {
    entries = entries.map((entry) =>
      entry.id === editingEntryId
        ? {
            ...entry,
            title: selectedBook.title || "",
            author: selectedBook.authors?.[0] || "",
            isbn: selectedBook.isbn || "",
            date: entryData.date,
            rating: entryData.rating,
            tags: entryData.tags,
            notes: String(entryData.notes || "").trim(),
            book: selectedBook,
          }
        : entry
    );
  } else {
    const entry = createEntry(entryData, selectedBook);
    entries = [entry, ...entries];
  }

  saveJSON(STORAGE_KEYS.entries, entries);
  renderHome();
  renderShelf();
  const savedEntryId = isEditing ? editingEntryId : entries[0]?.id || null;
  pendingRevealEntryId = savedEntryId;
  setComposerOpen(false);
  resetComposerState(false);
  setView("shelf");
  setStatus(isEditing ? "수정 내용을 저장했습니다." : "기록을 저장했습니다.", "success");
  // state reset happens before switching to shelf so the new card can be revealed
});

function initialize() {
  seedDateField();
  setRatingValue("");
  syncTagButtons();
  renderHome();
  renderShelf();
  setComposerOpen(false);
  setView("home");
  syncViewButtons();
  restoreComposerDraft();
  loadFeaturedBooks(false);
}

function setFeaturedPanelOpen(isOpen) {
  if (featuredPanel) featuredPanel.hidden = !isOpen;
  if (featuredBackdrop) featuredBackdrop.hidden = !isOpen;
  if (featuredPanel) featuredPanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
  document.body.classList.toggle("featured-open", isOpen);
}

function openTrendingPanel() {
  setFeaturedPanelOpen(true);
  loadFeaturedBooks(false);
}

function closeTrendingPanel() {
  setFeaturedPanelOpen(false);
}

function exportBackup() {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
    lastQuery: loadJSON(STORAGE_KEYS.lastQuery, ""),
    lastBook: loadJSON(STORAGE_KEYS.lastBook, null),
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `reading-journal-backup-${stamp}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  updateBackupStatus("JSON 백업 파일을 내려받았습니다.", "success");
}

async function handleBackupImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const importedEntries = Array.isArray(data.entries) ? data.entries : Array.isArray(data) ? data : null;

    if (!importedEntries) {
      throw new Error("잘못된 백업 형식");
    }

    const confirmed = window.confirm("현재 기록을 백업 파일 내용으로 덮어쓸까요?");
    if (!confirmed) return;

    entries = importedEntries;
    saveJSON(STORAGE_KEYS.entries, entries);
    saveJSON(STORAGE_KEYS.lastQuery, typeof data.lastQuery === "string" ? data.lastQuery : "");
    saveJSON(STORAGE_KEYS.lastBook, data.lastBook && typeof data.lastBook === "object" ? data.lastBook : null);
    renderHome();
    renderShelf();
    restoreComposerDraft();
    updateBackupStatus("백업을 복원했습니다.", "success");
  } catch {
    updateBackupStatus("백업 파일을 읽지 못했습니다. JSON 형식을 확인해 주세요.", "error");
  } finally {
    event.target.value = "";
  }
}

function updateBackupStatus(message, tone = "info") {
  if (backupStatus) {
    backupStatus.textContent = message;
    backupStatus.dataset.tone = tone;
  }
}

function renderHome() {
  const stats = getJournalStats(entries);
  entryCount.textContent = String(stats.totalEntries);
  uniqueBookCount.textContent = String(stats.uniqueBooks);
  latestReadAt.textContent = stats.latestReadAt ? formatKoreanDate(stats.latestReadAt) : "-";
  homeTotalCount.textContent = `${stats.totalEntries}권`;
  homeLatestRead.textContent = stats.latestReadAt
    ? `${stats.latestReadTitle || "최근 완독 책 없음"} · ${formatKoreanDate(stats.latestReadAt)}`
    : "-";
}

function getShelfTotalPages() {
  return Math.max(1, Math.ceil(entries.length / SHELF_PAGE_SIZE));
}

function renderShelf() {
  if (activeView !== "shelf") {
    shelfList.innerHTML = "";
    shelfStatus.textContent = "";
    shelfPageInfo.textContent = "1 / 1";
    prevShelfBtn.disabled = true;
    nextShelfBtn.disabled = true;
    return;
  }

  syncShelfTagOptions();

  const filtered = getFilteredShelfEntries();
  const totalPages = Math.max(1, Math.ceil(filtered.length / SHELF_PAGE_SIZE));
  shelfPage = Math.min(shelfPage, totalPages);
  const startIndex = (shelfPage - 1) * SHELF_PAGE_SIZE;
  const visibleEntries = filtered.slice(startIndex, startIndex + SHELF_PAGE_SIZE);

  renderEntries(shelfList, visibleEntries, {
    compact: true,
    emptyTitle: "서재가 비어 있습니다",
    emptyMessage: getShelfEmptyMessage(),
    onSelect: openDetail,
  });

  if (pendingRevealEntryId) {
    const target = shelfList.querySelector(`[data-entry-id="${pendingRevealEntryId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("entry-card--highlight");
      window.setTimeout(() => {
        target.classList.remove("entry-card--highlight");
      }, 1800);
      pendingRevealEntryId = null;
    }
  }

  shelfStatus.textContent =
    filtered.length > 0
      ? `${startIndex + 1} - ${startIndex + visibleEntries.length} / ${filtered.length}권`
      : getShelfEmptyMessage();
  shelfPageInfo.textContent = `${shelfPage} / ${totalPages}`;
  prevShelfBtn.disabled = shelfPage <= 1;
  nextShelfBtn.disabled = shelfPage >= totalPages;

  if (activeDetailEntryId) {
    const activeEntry = filtered.find((entry) => entry.id === activeDetailEntryId);
    if (activeEntry) renderDetail(activeEntry);
    else closeDetail();
  }
}

async function loadFeaturedBooks(force = false) {
  if (featuredBooksLoading) return;
  if (featuredBooks.length && !force) {
    renderFeaturedBooks();
    return;
  }

  featuredBooksLoading = true;
  updateFeaturedBooksStatus("현재 인기 도서를 불러오는 중입니다.");

  try {
    const queries = ["베스트셀러", "인기 도서", "추천 도서"];
    const results = await Promise.all(queries.map((query) => searchBooks(query, 4)));
    const merged = [];

    for (const result of results) {
      for (const book of result.books || []) {
        if (!merged.some((item) => sameBook(item, book))) {
          merged.push(book);
        }
      }
    }

    featuredBooks = merged.slice(0, 6);

    if (!featuredBooks.length) {
      updateFeaturedBooksStatus("현재 참고할 베스트셀러 정보를 찾지 못했습니다.");
    } else {
      updateFeaturedBooksStatus("광고 없이 참고용으로 보는 현재 인기 도서입니다.");
    }

    renderFeaturedBooks();
  } catch {
    featuredBooks = [];
    updateFeaturedBooksStatus("현재 베스트셀러 정보를 불러오지 못했습니다.");
    renderFeaturedBooks();
  } finally {
    featuredBooksLoading = false;
  }
}

function renderFeaturedBooks() {
  if (!featuredBooksList) return;

  if (!featuredBooks.length) {
    featuredBooksList.innerHTML = `
      <p class="empty-state empty-state--compact">지금은 참고할 인기 도서가 없습니다.</p>
    `;
    return;
  }

  featuredBooksList.innerHTML = featuredBooks
    .map(
      (book, index) => `
        <article class="featured-book card-shell" data-featured-index="${index}">
          ${
            book.cover
              ? `<img class="featured-book__cover" src="${escapeHtml(book.cover)}" alt="${escapeHtml(book.title || "베스트셀러 책")}" loading="lazy" onerror="this.remove()" />`
              : `<div class="featured-book__cover cover--placeholder" aria-hidden="true"></div>`
          }
          <div class="featured-book__body">
            <p class="featured-book__eyebrow">현재 인기</p>
            <h4>${escapeHtml(book.title || "제목 없음")}</h4>
            <p class="featured-book__author">${escapeHtml(book.authors?.join(", ") || "저자 정보 없음")}</p>
            <div class="featured-book__meta">
              <span>${escapeHtml(book.publisher || "-")}</span>
              <span>${escapeHtml(book.publishYear || "-")}</span>
              ${book.priceSales ? `<span>판매가 ${escapeHtml(book.priceSales)}원</span>` : ""}
            </div>
            <div class="featured-book__actions">
              <button type="button" class="ghost" data-featured-record="${index}">기록하기</button>
              ${
                book.sourceUrl
                  ? `<a class="ghost ghost--inline" href="${escapeHtml(book.sourceUrl)}" target="_blank" rel="noreferrer">원문 보기</a>`
                  : ""
              }
            </div>
          </div>
        </article>
      `
    )
    .join("");

  featuredBooksList.querySelectorAll("[data-featured-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.featuredRecord);
      openComposerWithBook(featuredBooks[index]);
    });
  });
}

function updateFeaturedBooksStatus(message) {
  if (featuredBooksStatus) {
    featuredBooksStatus.textContent = message;
  }
}

function sameBook(left, right) {
  return Boolean(
    left &&
      right &&
      (left.isbn && right.isbn ? left.isbn === right.isbn : left.title === right.title && left.authors?.[0] === right.authors?.[0])
  );
}

function openComposerWithBook(book) {
  if (!book) return;

  closeTrendingPanel();
  openComposer();
  selectedBook = book;
  saveJSON(STORAGE_KEYS.lastBook, selectedBook);
  renderSelectedBook(selectedBookView, selectedBook, clearSelectedBook);
  setFormEnabled(true);
  updateSaveHint();
  if (bookQueryInput) {
    bookQueryInput.value = book.title || "";
  }
  updateFeaturedBooksStatus(`"${book.title || "선택한 책"}"을(를) 기록할 수 있습니다.`);
}

function getSortedEntries() {
  return [...entries].sort((a, b) => {
    const left = new Date(b.date || b.createdAt || 0).getTime();
    const right = new Date(a.date || a.createdAt || 0).getTime();
    return left - right;
  });
}

function getFilteredShelfEntries() {
  let list = filterEntries(getSortedEntries(), shelfQuery);

  if (shelfTag !== "all") {
    list = list.filter((entry) => Array.isArray(entry.tags) && entry.tags.includes(shelfTag));
  }

  if (shelfSort === "oldest") {
    return [...list].sort((a, b) => {
      const left = new Date(a.date || a.createdAt || 0).getTime();
      const right = new Date(b.date || b.createdAt || 0).getTime();
      return left - right;
    });
  }

  if (shelfSort === "title") {
    return [...list].sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "ko"));
  }

  return list;
}

function getShelfEmptyMessage() {
  if (!entries.length) return "책 추가 버튼을 눌러 첫 독서 기록을 남겨보세요.";
  if (shelfQuery.trim() || shelfTag !== "all") return "조건에 맞는 책이 없습니다. 검색어, 태그, 정렬을 바꿔 보세요.";
  return "서재가 비어 있습니다.";
}

function syncShelfTagOptions() {
  if (!shelfTagSelect) return;

  const tags = [...new Set(entries.flatMap((entry) => entry.tags || []))].sort((a, b) =>
    String(a).localeCompare(String(b), "ko")
  );
  shelfTagSelect.innerHTML = [
    '<option value="all">전체 태그</option>',
    ...tags.map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`),
  ].join("");
  if (shelfTag !== "all" && !tags.includes(shelfTag)) {
    shelfTag = "all";
  }
  shelfTagSelect.value = shelfTag;
}

function openDetail(entryId) {
  const entry = getSortedEntries().find((item) => item.id === entryId);
  if (!entry) return;

  activeDetailEntryId = entryId;
  renderDetail(entry);
  detailPanel.hidden = false;
  detailBackdrop.hidden = false;
  detailPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-open");
}

function renderDetail(entry) {
  detailTitle.textContent = entry.title || "책 정보";
  detailAuthor.textContent = entry.author || "저자 정보 없음";
  if (detailInfo) {
    detailInfo.innerHTML = `
      <span>출판사: ${escapeHtml(entry.book?.publisher || "-")}</span>
      <span>출간연도: ${escapeHtml(entry.book?.publishYear || "-")}</span>
      <span>ISBN: ${escapeHtml(entry.isbn || "-")}</span>
      <span>완독일: ${escapeHtml(entry.date ? formatKoreanDate(entry.date) : "-")}</span>
    `;
  }
  detailMeta.innerHTML = `
    <span>평점: ${escapeHtml(entry.rating || "-")}</span>
    <span>기록일: ${escapeHtml(entry.createdAt ? formatKoreanDate(entry.createdAt) : "-")}</span>
    <span>표지: ${escapeHtml(entry.book?.cover ? "있음" : "없음")}</span>
    <span>${entry.book?.sourceUrl ? "원문 정보 있음" : "원문 정보 없음"}</span>
  `;

  detailTags.innerHTML = entry.tags?.length
    ? entry.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")
    : "";

  detailNotes.textContent = entry.notes || "감상이 없습니다.";

  detailCover.innerHTML = entry.book?.cover
    ? `<img class="cover detail-cover" src="${escapeHtml(entry.book.cover)}" alt="${escapeHtml(entry.title || "책")}" loading="lazy" onerror="this.remove()" />`
    : `<div class="cover detail-cover cover--placeholder" aria-hidden="true"></div>`;
}

function closeDetail() {
  activeDetailEntryId = null;
  detailPanel.hidden = true;
  detailBackdrop.hidden = true;
  detailPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("detail-open");
}

function deleteActiveEntry() {
  if (!activeDetailEntryId) return;

  entries = entries.filter((entry) => entry.id !== activeDetailEntryId);
  saveJSON(STORAGE_KEYS.entries, entries);
  closeDetail();
  renderHome();
  renderShelf();
}

function setView(view) {
  closeDetail();
  closeTrendingPanel();
  activeView = view;
  homeView.hidden = view !== "home";
  shelfView.hidden = view !== "shelf";
  syncViewButtons();

  if (view === "shelf") {
    shelfPage = 1;
    renderShelf();
  }

  const scrollToTop = () => {
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  };

  scrollToTop();
  requestAnimationFrame(scrollToTop);
  setTimeout(scrollToTop, 0);
  setTimeout(scrollToTop, 60);
}

function syncViewButtons() {
  goShelfBtn.textContent = activeView === "shelf" ? "닫기" : "내 서재 보기";
  goShelfBtn.setAttribute("aria-label", activeView === "shelf" ? "서재 닫기" : "내 서재 열기");
  backHomeBtn.textContent = "닫기";
  backHomeBtn.setAttribute("aria-label", "내 서재 닫기");
  if (backHomeFooterBtn) {
    backHomeFooterBtn.textContent = "닫기";
    backHomeFooterBtn.setAttribute("aria-label", "내 서재 닫기");
  }
}

function openComposer() {
  editingEntryId = null;
  composerOriginView = activeView;
  setComposerOpen(true);
  resetComposerState(false);
  setStatus("책 제목이나 ISBN을 입력해 검색해 보세요.");
  restoreComposerQuery();
  bookQueryInput.focus();
}

function openEditorForActiveEntry() {
  const entry = getSortedEntries().find((item) => item.id === activeDetailEntryId);
  if (!entry) return;

  closeDetail();
  editingEntryId = entry.id;
  composerOriginView = activeView;
  selectedBook = entry.book || {
    title: entry.title || "",
    authors: entry.author ? [entry.author] : [],
    isbn: entry.isbn || "",
    cover: entry.book?.cover || "",
    publisher: entry.book?.publisher || "",
    publishYear: entry.book?.publishYear || "",
    note: entry.book?.note || "",
  };

  saveJSON(STORAGE_KEYS.lastBook, selectedBook);
  setComposerOpen(true);
  renderSelectedBook(selectedBookView, selectedBook, clearSelectedBook);
  setFormEnabled(true);
  form.elements.date.value = entry.date || getTodayISO();
  setRatingValue(entry.rating || "");
  form.elements.tags.value = Array.isArray(entry.tags) ? entry.tags.join(", ") : "";
  syncTagButtons();
  form.elements.notes.value = entry.notes || "";
  bookQueryInput.value = entry.title || "";
  setStatus("수정할 내용을 바꾼 뒤 저장해 주세요.", "success");
  updateSaveHint();
  bookQueryInput.focus();
}

function closeComposer() {
  setView(composerOriginView);
  setComposerOpen(false);
}

function setComposerOpen(isOpen) {
  composerPanel.hidden = !isOpen;
  composerBackdrop.hidden = !isOpen;
  document.body.classList.toggle("composer-open", isOpen);
}

function resetComposerState(clearDraft = true) {
  editingEntryId = null;

  if (clearDraft) {
    selectedBook = null;
    saveJSON(STORAGE_KEYS.lastBook, selectedBook);
    bookQueryInput.value = "";
    searchResults.innerHTML = "";
    renderSelectedBook(selectedBookView, selectedBook, clearSelectedBook);
    setFormEnabled(false);
    setRatingValue("");
    syncTagButtons();
    updateSaveHint();
  }

  form.reset();
  seedDateField();
}

function restoreComposerDraft() {
  restoreComposerQuery();
}

function restoreComposerQuery() {
  const savedQuery = String(loadJSON(STORAGE_KEYS.lastQuery, "") || "").trim();
  const savedBook = loadJSON(STORAGE_KEYS.lastBook, null);

  if (savedBook && typeof savedBook === "object") {
    selectedBook = savedBook;
    renderSelectedBook(selectedBookView, selectedBook, clearSelectedBook);
    setFormEnabled(true);
    updateSaveHint();
  }

  if (!savedQuery || bookQueryInput.value.trim()) return;

  bookQueryInput.value = savedQuery;
  if (savedQuery.length >= 2) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => triggerSearch(bookQueryInput.value), 150);
  }
}

async function triggerSearch(query) {
  const normalized = String(query || "").trim();
  saveJSON(STORAGE_KEYS.lastQuery, normalized);
  if (normalized.length < 2) {
    setStatus("책 제목이나 ISBN을 2글자 이상 입력해 주세요.");
    renderSearchResults(searchResults, [], selectBook);
    return;
  }

  setStatus("관련 책을 찾는 중...");
  const result = await searchBooks(normalized, 8);
  setStatus(result.message, result.books.length ? "success" : "info");
  renderSearchResults(searchResults, result.books, selectBook);

  if (!result.books.length) {
    selectedBook = null;
    saveJSON(STORAGE_KEYS.lastBook, selectedBook);
    renderSelectedBook(selectedBookView, selectedBook, clearSelectedBook);
    setFormEnabled(false);
  }
}

function selectBook(book) {
  selectedBook = book;
  saveJSON(STORAGE_KEYS.lastBook, selectedBook);
  renderSelectedBook(selectedBookView, selectedBook, clearSelectedBook);
  setFormEnabled(true);
  updateSaveHint();
  setStatus(`"${selectedBook.title}"을(를) 선택했습니다.`, "success");
}

function clearSelectedBook() {
  selectedBook = null;
  saveJSON(STORAGE_KEYS.lastBook, selectedBook);
  renderSelectedBook(selectedBookView, selectedBook, clearSelectedBook);
  setFormEnabled(false);
  updateSaveHint();
  setStatus("책 선택을 해제했습니다.");
}

function setFormEnabled(enabled) {
  form.querySelectorAll("input, select, textarea, button").forEach((element) => {
    if (element.id === "saveBtn") {
      element.disabled = !enabled;
      return;
    }
    if (
      element.name === "date" ||
      element.name === "rating" ||
      element.name === "tags" ||
      element.name === "notes"
    ) {
      element.disabled = !enabled;
    }
  });
}

function setRatingValue(value) {
  if (!ratingField) return;

  ratingField.value = value ? String(value) : "";
  ratingQuickButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.ratingValue === ratingField.value);
  });
}

function syncTagButtons() {
  const activeTags = parseTags(form.elements.tags?.value || "").map((tag) => tag.toLowerCase());
  tagQuickButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      activeTags.includes(String(button.dataset.tagChip || "").toLowerCase())
    );
  });
}

function toggleTagChip(tag) {
  const normalizedTag = String(tag || "").trim();
  if (!normalizedTag || !form.elements.tags) return;

  const tags = parseTags(form.elements.tags.value);
  const lowerTag = normalizedTag.toLowerCase();
  const exists = tags.some((item) => item.toLowerCase() === lowerTag);
  const nextTags = exists ? tags.filter((item) => item.toLowerCase() !== lowerTag) : [...tags, normalizedTag];

  form.elements.tags.value = nextTags.join(", ");
  syncTagButtons();
  form.elements.tags.focus();
}

function updateSaveHint() {
  saveBtn.textContent = editingEntryId ? "수정 저장" : selectedBook ? "기록 저장" : "책을 선택해 주세요";
}

function seedDateField() {
  if (!form.elements.date.value) {
    form.elements.date.value = getTodayISO();
  }
}

function setStatus(message, tone = "info") {
  searchStatus.textContent = message;
  searchStatus.dataset.tone = tone;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
