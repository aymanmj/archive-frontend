// src/components/files/FilePreviewModal.tsx

import React, { useEffect, useMemo, useRef } from "react";
import type { PreviewFile } from "./types";

type Props = { open: boolean; file: PreviewFile | null; onClose: () => void; };

function formatDT(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-LY", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}
function formatBytes(b?: number) {
  if (!b && b !== 0) return "—";
  const u = ["B", "KB", "MB", "GB"]; let i = 0; let x = b!;
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
  return `${x.toFixed(1)} ${u[i]}`;
}

const isImage = (ext?: string) => !!ext && ['png','jpg','jpeg','gif','webp','bmp','tif','tiff','svg'].includes(ext.toLowerCase());
const isPdf   = (ext?: string) => (ext ?? '').toLowerCase() === 'pdf';
const isVideo = (ext?: string) => !!ext && ['mp4','webm','ogg','ogv','mov','m4v'].includes(ext.toLowerCase());
const isAudio = (ext?: string) => !!ext && ['mp3','wav','ogg','m4a','aac','flac'].includes(ext.toLowerCase());

const FilePreviewModal: React.FC<Props> = ({ open, file, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open) { if (!dlg.open) dlg.showModal(); } else if (dlg.open) { dlg.close(); }
  }, [open]);

  const ext = useMemo(() => {
    if (!file?.fileNameOriginal) return undefined;
    const p = file.fileNameOriginal.split('.');
    return p.length > 1 ? p.pop() : undefined;
  }, [file]);

  const url = file?.fileUrl;

  return (
    <dialog ref={dialogRef} className="rounded-2xl p-0 w-[95vw] md:w-[80vw] max-w-5xl backdrop:bg-black/40" onClose={onClose} dir="rtl">
      <div className="bg-white rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="font-semibold">معاينة الملف</div>
            {file && (
              <div className="text-xs text-slate-500">
                {file.fileNameOriginal} • {formatBytes(file.fileSizeBytes)} • {formatDT(file.uploadedAt)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <a className="rounded-xl bg-slate-800 text-white px-3 py-1.5 text-sm" href={url} target="_blank" rel="noreferrer">
                تنزيل
              </a>
            )}
            <button className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={onClose}>إغلاق</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-0 bg-gray-50">
          {!file || !url ? (
            <div className="p-6 text-sm text-slate-500">لا يوجد ملف للمعاينة.</div>
          ) : isImage(ext) ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <img src={url} alt={file.fileNameOriginal} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            </div>
          ) : isPdf(ext) ? (
            // استخدام <embed> يعطي نتائج أفضل للـ PDF في متصفحات كثيرة
            <div className="w-full h-[80vh]">
              <embed src={`${url}#toolbar=1&navpanes=0`} type="application/pdf" className="w-full h-full" />
            </div>
          ) : isVideo(ext) ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <video src={url} controls className="max-w-full max-h-[75vh] rounded-lg" />
            </div>
          ) : isAudio(ext) ? (
            <div className="p-6 flex items-center justify-center">
              <audio src={url} controls className="w-full" />
            </div>
          ) : (
            <div className="p-6 text-center text-gray-600">
              لا يمكن معاينة هذا النوع من الملفات داخل المتصفح.
              <div className="mt-2">
                <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
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
    </dialog>
  );
};

export default FilePreviewModal;





// import React, { useEffect, useMemo, useRef } from "react";
// import type { PreviewFile } from "./types";

// type Props = {
//   open: boolean;
//   file: PreviewFile | null;
//   onClose: () => void;
// };

// function formatDT(v?: string) {
//   if (!v) return "—";
//   const d = new Date(v);
//   if (isNaN(d.getTime())) return "—";
//   return d.toLocaleString("ar-LY", {
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// function formatBytes(b?: number) {
//   if (!b && b !== 0) return "—";
//   const u = ["B", "KB", "MB", "GB"];
//   let i = 0;
//   let x = b!;
//   while (x >= 1024 && i < u.length - 1) {
//     x /= 1024;
//     i++;
//   }
//   return `${x.toFixed(1)} ${u[i]}`;
// }

// const FilePreviewModal: React.FC<Props> = ({ open, file, onClose }) => {
//   const dialogRef = useRef<HTMLDialogElement | null>(null);

//   useEffect(() => {
//     const dlg = dialogRef.current;
//     if (!dlg) return;
//     if (open) {
//       if (!dlg.open) dlg.showModal();
//     } else if (dlg.open) {
//       dlg.close();
//     }
//   }, [open]);

//   const canInlinePreview = useMemo(() => {
//     // بسيط: اعرض iframe لو عندنا fileUrl
//     return !!file?.fileUrl;
//   }, [file]);

//   return (
//     <dialog
//       ref={dialogRef}
//       className="rounded-2xl p-0 w-[95vw] md:w-[80vw] max-w-5xl backdrop:bg-black/40"
//       onClose={onClose}
//       aria-labelledby="file-preview-title"
//       dir="rtl"
//     >
//       <div className="bg-white rounded-2xl overflow-hidden">
//         {/* Header */}
//         <div className="flex items-center justify-between border-b px-4 py-3">
//           <div>
//             <div id="file-preview-title" className="font-semibold">
//               معاينة الملف
//             </div>
//             {file && (
//               <div className="text-xs text-slate-500">
//                 {file.fileNameOriginal} • {formatBytes(file.fileSizeBytes)} • {formatDT(file.uploadedAt)}
//               </div>
//             )}
//           </div>
//           <button
//             className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
//             onClick={onClose}
//             autoFocus
//           >
//             إغلاق
//           </button>
//         </div>

//         {/* Body */}
//         <div className="p-0">
//           {!file ? (
//             <div className="p-6 text-sm text-slate-500">لا يوجد ملف للمعاينة.</div>
//           ) : canInlinePreview ? (
//             <iframe
//               src={file.fileUrl}
//               className="w-full h-[70vh]"
//               title={file.fileNameOriginal}
//             />
//           ) : (
//             <div className="p-6 text-sm text-slate-500">
//               لا يمكن عرض هذا الملف داخل المتصفح. يمكنك تنزيله وفتحه محليًا.
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="border-t px-4 py-3 flex items-center justify-end gap-2">
//           {file?.fileUrl && (
//             <a
//               href={file.fileUrl}
//               target="_blank"
//               rel="noreferrer"
//               className="rounded-xl bg-slate-800 text-white px-3 py-1.5 text-sm"
//             >
//               تنزيل
//             </a>
//           )}
//           <button
//             className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
//             onClick={onClose}
//           >
//             إغلاق
//           </button>
//         </div>
//       </div>
//     </dialog>
//   );
// };

// export default FilePreviewModal;
