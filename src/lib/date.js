export function formatKoreanDate(value) {
  if (!value) return "날짜 없음";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("ko-KR").format(date);
}

export function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}
