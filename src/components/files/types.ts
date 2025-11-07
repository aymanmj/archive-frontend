// src/components/files/types.ts

// نوع موحّد لعرض/معاينة الملف
export type PreviewFile = {
  id: string | number;
  fileNameOriginal: string;
  fileUrl: string;         // رابط مباشر مثل /files/YYYY/MM/<docId>/<file>
  fileExtension?: string;
  fileSizeBytes?: number;
  uploadedAt?: string;
};




// // نوع الملف الذي سيتم معاينته

// export type PreviewFile = {
//   id: string | number;
//   fileNameOriginal: string;
//   fileUrl?: string;         // رابط مباشر إن وُجد (مثلاً /files/<path> أو /files/:id/download)
//   fileSizeBytes?: number;
//   uploadedAt?: string;
//   // يمكن التوسعة لاحقًا (mimeType, extension, ...)
// };
