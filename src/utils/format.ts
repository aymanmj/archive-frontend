// src/utils/format.ts

/** يعرض التاريخ/الوقت بالتنسيق العربي المحلي */
export function formatDateAR(input: string | number | Date, options?: Intl.DateTimeFormatOptions) {
  const d = new Date(input);
  const fmt: Intl.DateTimeFormatOptions = options ?? {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };
  // اختر اللهجة المناسبة: ar-LY أو ar-EG. (اخترت ar-LY افتراضيًا)
  return d.toLocaleString('ar-LY', fmt);
}

export function formatBytes(n?: number | null) {
  if (!n || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let num = n;
  while (num >= 1024 && i < units.length - 1) { num /= 1024; i++; }
  return `${num.toFixed(num < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

