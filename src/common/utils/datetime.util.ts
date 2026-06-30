const KST_OFFSET_MINUTES = 9 * 60;

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function toKstIso(date: Date): string {
  const shifted = new Date(date.getTime() + KST_OFFSET_MINUTES * 60_000);
  const year = shifted.getUTCFullYear();
  const month = pad2(shifted.getUTCMonth() + 1);
  const day = pad2(shifted.getUTCDate());
  const hour = pad2(shifted.getUTCHours());
  const minute = pad2(shifted.getUTCMinutes());
  const second = pad2(shifted.getUTCSeconds());
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}
