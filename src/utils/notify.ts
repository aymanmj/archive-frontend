// src/utils/notify.ts

import { toast } from "sonner";

export const notify = {
  ok: (msg: string) => toast.success(msg),
  warn: (msg: string) => toast.warning(msg),
  err: (msg: string | unknown) =>
    toast.error(
      typeof msg === "string"
        ? msg
        : "حدث خطأ، حاول مرة أخرى."
    ),
  // التفاف جميل لطلبات Axios (وغيره)
  promise<T>(p: Promise<T>, labels: { loading: string; success: string; error?: (e:any)=>string }) {
    return toast.promise(p, {
      loading: labels.loading,
      success: labels.success,
      error: (e) =>
        labels.error
          ? labels.error(e)
          : (e?.response?.data?.message ?? e?.message ?? "فشل العملية"),
    });
  },
};

export default notify;
