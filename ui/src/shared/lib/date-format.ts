export const APP_TIME_ZONE = "Asia/Seoul";

export function formatKoreanDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
    hour12: false,
  }).format(new Date(value));
}
