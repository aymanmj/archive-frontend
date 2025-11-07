// src/components/UploadFilesDialog.tsx

import { useState } from "react";
import api from "../api/apiClient";
import { toast } from "sonner";

type Props = {
  documentId: string | null;
  open: boolean;
  onClose: () => void;
  onUploaded?: () => void;
  maxSizeMB?: number;
};

export default function UploadFilesDialog({ documentId, open, onClose, onUploaded, maxSizeMB = 50 }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open || !documentId) return null;

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      toast.error("اختر ملفًا واحدًا على الأقل");
      return;
    }
    setBusy(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files.item(i)!;
        if (f.size > maxSizeMB * 1024 * 1024) {
          toast.error(`الملف ${f.name} يتجاوز ${maxSizeMB}MB`);
          continue;
        }
        const form = new FormData();
        form.append("file", f);
        await api.post(`/documents/${documentId}/files`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      toast.success("تم رفع الملفات");
      onUploaded?.();
      onClose();
      setFiles(null);
    } catch (e:any) {
      toast.error(e?.response?.data?.message ?? "تعذّر رفع الملفات");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" dir="rtl">
      <div className="w-[520px] max-w-[90vw] rounded-2xl bg-white p-5 shadow-xl border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">رفع ملفات للوثيقة</h3>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">إغلاق</button>
        </div>

        <div className="space-y-3">
          <input type="file" multiple onChange={(e) => setFiles(e.target.files)} className="block w-full text-sm" />
          <p className="text-xs text-gray-500">الحد الأقصى للملف: {maxSizeMB}MB. يمكنك اختيار أكثر من ملف.</p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">إلغاء</button>
          <button onClick={handleUpload} disabled={busy} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm disabled:opacity-60">
            {busy ? "جارٍ الرفع..." : "رفع"}
          </button>
        </div>
      </div>
    </div>
  );
}
