import { STORAGE_KEYS } from "./config.js";
import { loadJSON, saveJSON } from "./lib/storage.js";
import { parseTags } from "./lib/text.js";
import { formatKoreanDate, getTodayISO } from "./lib/date.js";
import { searchBooks } from "./services/naverBooks.js";
import { createEntry, getJournalStats } from "./state/journal.js";
import { renderEntries, renderSearchResults, renderSelectedBook } from "./ui/render.js";

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
const journalList = document.querySelector("#journalList");
const entryCount = document.querySelector("#entryCount");
const uniqueBookCount = document.querySelector("#uniqueBookCount");
const latestReadAt = document.querySelector("#latestReadAt");
const saveBtn = document.querySelector("#saveBtn");

let entries = loadJSON(STORAGE_KEYS.entries, []);
let selectedBook = null;
let searchTimer = null;

initialize();

openComposerBtn.addEventListener("click", openComposer);
closeComposerBtn.addEventListener("click", closeComposer);
composerBackdrop.addEventListener("click", closeComposer);

searchBtn.addEventListener("click", () => {
  triggerSearch(bookQueryInput.value);
});

bookQueryInput.addEventListener("input", () => {
  clearTimeout(searchTimer);

  if (bookQueryInput.value.trim().length < 2) {
    setStatus("책 제목의 일부를 2글자 이상 입력하면 관련 책을 보여드립니다.");
    renderSearchResults(searchResults, [], selectBook);
    return;
  }

  setStatus("책을 찾는 중...");
  searchTimer = setTimeout(() => {
    triggerSearch(bookQueryInput.value);
  }, 350);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!selectedBook) {
    setStatus("먼저 책을 선택해 주세요.");
    return;
  }

  const payload = Object.fromEntries(new FormData(form).entries());
  const entry = createEntry(
    {
      date: payload.date,
      rating: payload.rating,
      tags: parseTags(payload.tags),
      notes: payload.notes,
    },
    selectedBook
  );

  entries = [entry, ...entries];
  saveJSON(STORAGE_KEYS.entries, entries);
  renderEntries(journalList, entries);
  updateStats();
  closeComposer();
  setStatus("기록을 저장했습니다.", "success");
  resetComposerState();
});

journalList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;

  entries = entries.filter((entry) => entry.id !== button.dataset.deleteId);
  saveJSON(STORAGE_KEYS.entries, entries);
  renderEntries(journalList, entries);
  updateStats();
});

function initialize() {
  seedDateField();
  renderEntries(journalList, entries);
  updateStats();
  setComposerOpen(false);
}

function openComposer() {
  setComposerOpen(true);
  resetComposerState();
  setStatus("책 제목 일부나 ISBN을 입력해 검색해 보세요.");
  bookQueryInput.focus();
}

function closeComposer() {
  setComposerOpen(false);
  resetComposerState();
}

function setComposerOpen(isOpen) {
  composerPanel.hidden = !isOpen;
  composerBackdrop.hidden = !isOpen;
  document.body.classList.toggle("composer-open", isOpen);
}

function resetComposerState() {
  selectedBook = null;
  saveJSON(STORAGE_KEYS.lastBook, selectedBook);
  bookQueryInput.value = "";
  searchResults.innerHTML = "";
  renderSelectedBook(selectedBookView, selectedBook, clearSelectedBook);
  setFormEnabled(false);
  updateSaveHint();
  form.reset();
  seedDateField();
}

async function triggerSearch(query) {
  const normalized = String(query || "").trim();
  if (normalized.length < 2) {
    setStatus("책 제목의 일부를 2글자 이상 입력해 주세요.");
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
  setStatus(`"${selectedBook.title}"을 선택했습니다.`, "success");
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

    if (element.name === "date" || element.name === "rating" || element.name === "tags" || element.name === "notes") {
      element.disabled = !enabled;
    }
  });
}

function updateSaveHint() {
  saveBtn.textContent = selectedBook ? "기록 저장" : "먼저 책을 선택해 주세요";
}

function updateStats() {
  const stats = getJournalStats(entries);
  entryCount.textContent = String(stats.totalEntries);
  uniqueBookCount.textContent = String(stats.uniqueBooks);
  latestReadAt.textContent = stats.latestReadAt ? formatKoreanDate(stats.latestReadAt) : "-";
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
