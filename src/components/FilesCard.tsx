import { useEffect, useState } from 'react';
import api from '../api/apiClient';
import { formatBytes } from '../utils/format';

type DocFile = {
  id: string;
  fileNameOriginal: string;
  fileUrl: string;
  fileExtension: string;
  fileSizeBytes: number;
  uploadedAt: string;
  versionNumber: number;
};

function FilesCard({ documentId }: { documentId: string }) {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<DocFile[]>(`/documents/${documentId}/files`);
      setFiles(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [documentId]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/documents/${documentId}/files`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('حذف الملف؟')) return;
    await api.delete(`/documents/files/${id}`);
    await load();
  };

  return (
    <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">المرفقات</h3>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={onUpload}
            disabled={uploading}
          />
          <span className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
            {uploading ? 'جارِ الرفع…' : 'رفع ملف'}
          </span>
        </label>
      </div>

      {loading && <div className="text-sm text-gray-500">جارِ التحميل…</div>}

      {!loading && files.length === 0 && (
        <div className="text-sm text-gray-500">لا توجد مرفقات بعد.</div>
      )}

      {!loading && files.length > 0 && (
        <div className="overflow-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-right p-2">الاسم</th>
                <th className="text-right p-2">الحجم</th>
                <th className="text-right p-2">الإصدار</th>
                <th className="text-right p-2">تاريخ الرفع</th>
                <th className="text-right p-2">عمليات</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-2">
                    <a
                      href={f.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
                      title="فتح/تنزيل"
                    >
                      {f.fileNameOriginal}
                    </a>
                  </td>
                  <td className="p-2">{formatBytes(f.fileSizeBytes)}</td>
                  <td className="p-2">v{f.versionNumber}</td>
                  <td className="p-2">
                    {new Date(f.uploadedAt).toLocaleString('ar-LY', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => onDelete(f.id)}
                      className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default FilesCard;
