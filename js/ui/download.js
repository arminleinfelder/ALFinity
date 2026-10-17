// Gives the user a file to save (favorites export, image export).

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** "2026-10-17" or "20261017-153012" from the local date and time. */
export function stamp(withTime = false, d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  if (!withTime) return date;
  return `${date.replaceAll("-", "")}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
