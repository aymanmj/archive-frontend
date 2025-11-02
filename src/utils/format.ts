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
