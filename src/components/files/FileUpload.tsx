// src/components/files/FileUpload.tsx
import { useRef, useState } from 'react';
import api from '../../api/apiClient';

type Props = {
  documentId: string | number;
  onUploaded?: () => void;             // استدعاء بعد نجاح الرفع لتحديث القائمة
  accept?: string;                     // مثل: ".pdf,.doc,.docx,image/*"
  maxSizeMB?: number;                  // حجم أقصى اختياري
  buttonLabel?: string;
};

export default function FileUpload({
  documentId,
  onUploaded,
  accept,
  maxSizeMB = 50,
  buttonLabel = 'رفع ملف',
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null);

    // تحقق الحجم
    if (f.size > maxSizeMB * 1024 * 1024) {
      setErr(`الحجم الأقصى ${maxSizeMB}MB`);
      e.target.value = '';
      return;
    }

    // ارفع
    const form = new FormData();
    form.append('file', f);
    setBusy(true);
    try {
      await api.post(`/documents/${documentId}/files`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded?.();
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? 'فشل رفع الملف');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        className={`rounded-xl border px-3 py-2 text-sm ${busy ? 'opacity-60' : 'hover:bg-gray-50'}`}
      >
        {busy ? 'جارٍ الرفع...' : buttonLabel}
      </button>
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  );
}
