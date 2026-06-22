import { formatKoreanDate } from "../lib/date.js";
import { escapeHtml } from "../lib/text.js";

export function renderEntries(container, entries) {
  if (!entries.length) {
    container.innerHTML = `
      <article class="empty-state card-shell empty-state--hero">
        <h3>아직 읽은 책이 없습니다</h3>
        <p>책 추가 버튼을 눌러 첫 독서 기록을 남겨보세요.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = entries
    .map((entry, index) => {
      const spineHue = (index * 41) % 360;
      return `
        <article class="entry-card card-shell" style="--spine-hue:${spineHue}; --spine-delay:${Math.min(index * 55, 420)}ms;">
          <div class="entry-card__cover">
            ${
              entry.book?.cover
                ? `<img class="cover cover--diary" src="${escapeHtml(entry.book.cover)}" alt="${escapeHtml(entry.title || "책 표지")}" loading="lazy" onerror="this.remove()" />`
                : `<div class="cover cover--placeholder cover--diary" aria-hidden="true"></div>`
            }
          </div>
          <div class="entry-card__body">
            <div class="entry-card__top">
              <div>
                <p class="entry-card__date">${escapeHtml(formatKoreanDate(entry.date))}</p>
                <h3>${escapeHtml(entry.title || "제목 없음")}</h3>
                <p class="entry-card__meta">
                  ${escapeHtml(entry.author || "저자 정보 없음")}
                  ${entry.book?.publisher ? ` · ${escapeHtml(entry.book.publisher)}` : ""}
                </p>
              </div>
              <button type="button" class="ghost ghost--inline" data-delete-id="${escapeHtml(entry.id)}">
                삭제
              </button>
            </div>

            <div class="entry-card__info">
              <span>평점 ${escapeHtml(entry.rating || "-")}</span>
              <span>${escapeHtml(entry.isbn || "ISBN 없음")}</span>
            </div>

            ${
              entry.tags?.length
                ? `<div class="tag-row">${entry.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`
                : ""
            }

            <p class="entry-card__notes">${escapeHtml(entry.notes || "감상이 없습니다.")}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

export function renderSearchResults(container, books, onSelect) {
  if (!books.length) {
    container.innerHTML = `
      <p class="empty-state empty-state--compact">
        검색 결과가 없습니다. 제목 일부나 ISBN으로 다시 검색해 주세요.
      </p>
    `;
    return;
  }

  container.innerHTML = books
    .map(
      (book, index) => `
        <button type="button" class="result-card" data-index="${index}">
          ${
            book.cover
              ? `<img class="cover cover--small" src="${escapeHtml(book.cover)}" alt="${escapeHtml(book.title || "검색 결과 표지")}" loading="lazy" onerror="this.remove()" />`
              : `<div class="cover cover--small cover--placeholder" aria-hidden="true"></div>`
          }
          <div class="result-card__body">
            <strong>${escapeHtml(book.title || "제목 없음")}</strong>
            <span>${escapeHtml(book.authors?.join(", ") || "저자 정보 없음")}</span>
            <span>${escapeHtml(book.publisher || "출판사 정보 없음")}</span>
            <span>${escapeHtml(book.publishYear || "")}</span>
          </div>
        </button>
      `
    )
    .join("");

  container.querySelectorAll("[data-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      onSelect(books[index]);
    });
  });
}

export function renderSelectedBook(container, book, onClear) {
  if (!book) {
    container.className = "selected-book empty card-shell";
    container.innerHTML = `
      <p class="empty-state empty-state--compact">책을 선택하면 제목, 저자, 출판 정보가 여기에 표시됩니다.</p>
    `;
    return;
  }

  container.className = "selected-book card-shell";
  container.innerHTML = `
    ${
      book.cover
        ? `<img class="cover" src="${escapeHtml(book.cover)}" alt="${escapeHtml(book.title || "선택한 책 표지")}" loading="lazy" onerror="this.remove()" />`
        : `<div class="cover cover--placeholder" aria-hidden="true"></div>`
    }
    <div class="selected-book__body">
      <div class="selected-book__header">
        <div>
          <p class="selected-book__eyebrow">선택한 책</p>
          <h3>${escapeHtml(book.title || "제목 없음")}</h3>
          <p class="book-meta">${escapeHtml(book.authors?.join(", ") || "저자 정보 없음")}</p>
        </div>
        <button type="button" class="ghost ghost--inline" data-clear-book>선택 해제</button>
      </div>
      <div class="book-meta-grid">
        <span>출판사: ${escapeHtml(book.publisher || "-")}</span>
        <span>출간일: ${escapeHtml(book.publishYear || "-")}</span>
        <span>ISBN: ${escapeHtml(book.isbn || "-")}</span>
      </div>
      ${book.note ? `<p class="book-note">${escapeHtml(book.note)}</p>` : ""}
    </div>
  `;

  container.querySelector("[data-clear-book]")?.addEventListener("click", onClear);
}
