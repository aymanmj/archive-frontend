// نوع الملف الذي سيتم معاينته

export type PreviewFile = {
  id: string | number;
  fileNameOriginal: string;
  fileUrl?: string;         // رابط مباشر إن وُجد (مثلاً /files/<path> أو /files/:id/download)
  fileSizeBytes?: number;
  uploadedAt?: string;
  // يمكن التوسعة لاحقًا (mimeType, extension, ...)
};
