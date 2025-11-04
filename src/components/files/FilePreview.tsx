// src/components/files/FilePreview.tsx

import { useEffect } from 'react';

export type PreviewFile = {
  id: string | number;
  fileNameOriginal: string;
  fileUrl: string;             // يجب أن يكون كاملاً مثل /files/2025/11/123/abc.pdf
  fileExtension?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  file?: PreviewFile | null;
};

function isImage(ext?: string) {
  if (!ext) return false;
  return ['png','jpg','jpeg','gif','webp','bmp','tif','tiff','svg'].includes(ext.toLowerCase());
}
function isPdf(ext?: string) {
  return (ext ?? '').toLowerCase() === 'pdf';
}
function isVideo(ext?: string) {
  return ['mp4','webm','ogg','ogv','mov','m4v'].includes((ext ?? '').toLowerCase());
}
function isAudio(ext?: string) {
  return ['mp3','wav','ogg','m4a','aac','flac'].includes((ext ?? '').toLowerCase());
}

export default function FilePreview({ open, onClose, file }: Props) {
  // إغلاق بالمفتاح Esc
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open || !file) return null;
  const ext = file.fileExtension || file.fileNameOriginal.split('.').pop();

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* خلفية */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* الحاوية */}
      <div className="absolute inset-0 p-3 md:p-6 flex">
        <div className="relative bg-white rounded-2xl shadow-xl border w-full max-w-6xl mx-auto my-auto flex flex-col overflow-hidden">
          {/* رأس */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <div className="text-sm text-gray-600 truncate">{file.fileNameOriginal}</div>
            <div className="flex items-center gap-2">
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                تنزيل
              </a>
              <button onClick={onClose} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">
                إغلاق
              </button>
            </div>
          </div>

          {/* المحتوى */}
          <div className="flex-1 bg-gray-50">
            {/* صور */}
            {isImage(ext) && (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                <img
                  src={file.fileUrl}
                  alt={file.fileNameOriginal}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              </div>
            )}

            {/* PDF */}
            {isPdf(ext) && (
              <div className="w-full h-[80vh]">
                <iframe
                  title={file.fileNameOriginal}
                  src={`${file.fileUrl}#toolbar=1&navpanes=0`}
                  className="w-full h-full"
                />
              </div>
            )}

            {/* فيديو */}
            {isVideo(ext) && (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                <video src={file.fileUrl} controls className="max-w-full max-h-[75vh] rounded-lg" />
              </div>
            )}

            {/* صوت */}
            {isAudio(ext) && (
              <div className="p-6 flex items-center justify-center">
                <audio src={file.fileUrl} controls className="w-full" />
              </div>
            )}

            {/* غير مدعوم للمعاينة */}
            {!isImage(ext) && !isPdf(ext) && !isVideo(ext) && !isAudio(ext) && (
              <div className="p-6 text-center text-gray-600">
                لا يمكن معاينة هذا النوع من الملفات داخل المتصفح.
                <div className="mt-2">
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    اضغط للتنزيل
                  </a>
                </div>
                <div className="text-xs text-gray-400 mt-3">
                  (يدعم المعاينة: الصور، PDF، الفيديو، الصوت)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
