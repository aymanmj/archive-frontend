// src/pages/MyDeskPage.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/apiClient";
import { toast } from "sonner";


type Dept = { id: number; name: string; status?: string };
type UserLite = { id: number; fullName: string; departmentId: number | null };

type Row = {
  id: string; // distributionId أو PK داخلي
  distributionId: string;
  status: "Open" | "InProgress" | "Closed" | "Escalated";
  lastUpdateAt?: string;
  incomingId: string;
  incomingNumber?: string;
  receivedDate?: string;
  externalPartyName?: string;
  document?: { id: string; title: string } | null;

  // حقول SLA / تصعيد
  dueAt?: string | null;
  priority?: number | null;
  escalationCount?: number | null;
};

type Resp = {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  rows: Row[];
};

type SlaSummary = {
  total: number;
  noSla: number;
  onTrack: number;
  dueSoon: number;
  overdue: number;
  escalated: number;
};

function fmtDT(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-LY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeCls(status: Row["status"]) {
  switch (status) {
    case "Open":
      return "bg-blue-100 text-blue-700";
    case "InProgress":
      return "bg-amber-100 text-amber-700";
    case "Closed":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-rose-100 text-rose-700";
  }
}

/** حالة SLA الداخلية للصف */
type SlaState = "NoSla" | "OnTrack" | "DueSoon" | "Overdue";

/** نحسب حالة SLA للصف بناءً على dueAt والحالة */
function classifySla(r: Row): SlaState {
  if (!r.dueAt) return "NoSla";

  // المعاملات المغلقة نعتبرها على المسار الصحيح
  if (r.status === "Closed") return "OnTrack";

  const d = new Date(r.dueAt);
  if (isNaN(d.getTime())) return "NoSla";

  const now = Date.now();
  const due = d.getTime();

  if (due <= now) {
    return "Overdue";
  }

  const diffMs = due - now;
  const diffHours = diffMs / 3_600_000;

  // نافذة "قريبة من الانتهاء" = 24 ساعة (يمكن لاحقاً ربطها بإعدادات SLA)
  const DUE_SOON_HOURS = 24;
  if (diffHours <= DUE_SOON_HOURS) {
    return "DueSoon";
  }

  return "OnTrack";
}

function isOverdue(r: Row) {
  return classifySla(r) === "Overdue";
}

/** فلاتر SLA التي نستخدمها في الواجهة + في ?sla= */
type SlaFilter = "all" | "noSla" | "onTrack" | "dueSoon" | "overdue" | "escalated";

function parseSlaFilterParam(v: string | null): SlaFilter {
  if (v === "noSla") return "noSla";
  if (v === "onTrack") return "onTrack";
  if (v === "dueSoon") return "dueSoon";
  if (v === "overdue") return "overdue";
  if (v === "escalated") return "escalated";
  return "all";
}

export default function MyDeskPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // فلاتر نص/تاريخ
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState(""); // debounced value
  const [from, setFrom] = useState(""); // YYYY-MM-DD
  const [to, setTo] = useState(""); // YYYY-MM-DD
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // فلاتر جديدة (أعلى الجدول)
  const [deptId, setDeptId] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [incomingNumber, setIncomingNumber] = useState("");
  const [distributionId, setDistributionId] = useState("");

  // فلتر SLA (منظور مكتبي)
  const [slaFilter, setSlaFilter] = useState<SlaFilter>(() =>
    parseSlaFilterParam(searchParams.get("sla"))
  );

  // مزامنة slaFilter لو تغيّر الـ URL (مثلاً من الداشبورد)
  useEffect(() => {
    setSlaFilter(parseSlaFilterParam(searchParams.get("sla")));
  }, [searchParams]);

  // مصادر القوائم
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [usersFilter, setUsersFilter] = useState<UserLite[]>([]);
  const [loadingUsersFilter, setLoadingUsersFilter] = useState(false);

  // بيانات الجدول
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ملخص SLA
  const [slaSummary, setSlaSummary] = useState<SlaSummary | null>(null);
  const [loadingSlaSummary, setLoadingSlaSummary] = useState(false);

  // ===== Debounce لحقل البحث =====
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQ(qInput.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  // تحميل الإدارات مرة واحدة
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<Dept[]>("/departments", {
          params: { status: "Active" },
        });
        setDepartments(Array.isArray(res.data) ? res.data : []);
      } catch {
        // تجاهل الخطأ في الفلتر فقط
      }
    })();
  }, []);

  // تحميل المستخدمين لفلتر أعلى الجدول عند تغيير deptId (اختياري)
  useEffect(() => {
    (async () => {
      setUsersFilter([]);
      setAssigneeId("");
      if (!deptId) return;
      setLoadingUsersFilter(true);
      try {
        const res = await api.get<UserLite[]>(`/users/by-department/${deptId}`);
        setUsersFilter(Array.isArray(res.data) ? res.data : []);
      } catch {
        // تجاهل
      } finally {
        setLoadingUsersFilter(false);
      }
    })();
  }, [deptId]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    if (q) p.set("q", q);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (deptId) p.set("deptId", deptId);
    if (assigneeId) p.set("assigneeId", assigneeId);
    if (incomingNumber.trim()) p.set("incomingNumber", incomingNumber.trim());
    if (distributionId.trim()) p.set("distributionId", distributionId.trim());
    // 🔹 SLA filter لا نرسله للسيرفر حالياً (فلترة واجهة فقط)
    return p.toString();
  }, [
    page,
    pageSize,
    q,
    from,
    to,
    deptId,
    assigneeId,
    incomingNumber,
    distributionId,
  ]);

  // إلغاء الطلب السابق عند تغيّر المعاملات
  const abortRef = useRef<AbortController | null>(null);

  async function load() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setErr(null);
    setLoading(true);
    try {
      const res = await api.get<Resp>(`/incoming/my-desk?${params}`, {
        signal: ctrl.signal as any,
      });
      setData(res.data);
    } catch (e: any) {
      // تجاهل الإلغاء
      if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
        setErr(e?.response?.data?.message ?? "فشل تحميل البيانات");
      }
    } finally {
      setLoading(false);
    }
  }

  // تحميل ملخص SLA لمكتبي
  // useEffect(() => {
  //   (async () => {
  //     setLoadingSlaSummary(true);
  //     try {
  //       const res = await api.get<{
  //         success: boolean;
  //         data?: SlaSummary;
  //         error?: { code: string; message: string };
  //       }>("/incoming/my-desk/sla-summary");

  //       if (res.data?.success && res.data.data) {
  //         setSlaSummary(res.data.data);
  //       } else {
  //         toast.error(
  //           res.data?.error?.message ||
  //             "تعذّر تحميل ملخّص الـ SLA لمكتبي"
  //         );
  //       }
  //     } catch (e: any) {
  //       toast.error("خطأ أثناء تحميل ملخّص الـ SLA");
  //     } finally {
  //       setLoadingSlaSummary(false);
  //     }
  //   })();
  // }, []);

  // تحميل ملخص SLA لمكتبي
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingSlaSummary(true);
      try {
        const res = await api.get<SlaSummary>("/incoming/my-desk/sla-summary");

        if (!cancelled) {
          setSlaSummary(res.data);
        }
      } catch (e: any) {
        if (!cancelled) {
          toast.error("خطأ أثناء تحميل ملخّص الـ SLA لمكتبي");
        }
      } finally {
        if (!cancelled) {
          setLoadingSlaSummary(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // ==== إجراءات سريعة (نماذج سفليّة) ==== (بدون تغيير)
  const [actLoading, setActLoading] = useState(false);

  // تغيير الحالة
  const [statusDistId, setStatusDistId] = useState<string>("");
  const [statusNew, setStatusNew] =
    useState<"Open" | "InProgress" | "Closed" | "Escalated">("InProgress");
  const [statusNote, setStatusNote] = useState("");

  // تعيين مكلّف
  const [assignDistId, setAssignDistId] = useState<string>("");
  const [assignDept, setAssignDept] = useState<string>("");
  const [assignUsers, setAssignUsers] = useState<UserLite[]>([]);
  const [assignUsersLoading, setAssignUsersLoading] = useState(false);
  const [assignUser, setAssignUser] = useState<string>("");
  const [assignNote, setAssignNote] = useState("");

  useEffect(() => {
    (async () => {
      setAssignUsers([]);
      setAssignUser("");
      if (!assignDept) return;
      setAssignUsersLoading(true);
      try {
        const res = await api.get<UserLite[]>(
          `/users/by-department/${assignDept}`
        );
        setAssignUsers(Array.isArray(res.data) ? res.data : []);
      } catch {
        // تجاهل
      } finally {
        setAssignUsersLoading(false);
      }
    })();
  }, [assignDept]);

  // إحالة وارد
  const [fwdIncomingId, setFwdIncomingId] = useState<string>("");
  const [fwdDept, setFwdDept] = useState<string>("");
  const [fwdUsers, setFwdUsers] = useState<UserLite[]>([]);
  const [fwdUsersLoading, setFwdUsersLoading] = useState(false);
  const [fwdUser, setFwdUser] = useState<string>("");
  const [fwdClosePrev, setFwdClosePrev] = useState(true);
  const [fwdNote, setFwdNote] = useState("");

  useEffect(() => {
    (async () => {
      setFwdUsers([]);
      setFwdUser("");
      if (!fwdDept) return;
      setFwdUsersLoading(true);
      try {
        const res = await api.get<UserLite[]>(`/users/by-department/${fwdDept}`);
        setFwdUsers(Array.isArray(res.data) ? res.data : []);
      } catch {
        // تجاهل
      } finally {
        setFwdUsersLoading(false);
      }
    })();
  }, [fwdDept]);

  async function applyStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!statusDistId) return alert("أدخل رقم توزيع صحيح");
    setActLoading(true);
    try {
      await api.patch(`/incoming/distributions/${statusDistId}/status`, {
        status: statusNew,
        note: statusNote || null,
      });
      setStatusNote("");
      await load();
      alert("تم تحديث الحالة");
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "فشل تغيير الحالة");
    } finally {
      setActLoading(false);
    }
  }

  async function applyAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignDistId) return alert("أدخل رقم توزيع صحيح");
    if (!assignDept) return alert("اختر الإدارة أولًا");
    if (!assignUser) return alert("اختر المكلّف");
    setActLoading(true);
    try {
      await api.patch(`/incoming/distributions/${assignDistId}/assign`, {
        assignedToUserId: Number(assignUser),
        note: assignNote || null,
      });
      setAssignNote("");
      await load();
      alert("تم التعيين");
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "فشل التعيين");
    } finally {
      setActLoading(false);
    }
  }

  async function applyForward(e: React.FormEvent) {
    e.preventDefault();
    if (!fwdIncomingId) return alert("أدخل رقم الوارد");
    if (!fwdDept) return alert("اختر القسم المستهدف");
    setActLoading(true);
    try {
      await api.post(`/incoming/${fwdIncomingId}/forward`, {
        targetDepartmentId: Number(fwdDept),
        assignedToUserId: fwdUser ? Number(fwdUser) : undefined,
        note: fwdNote || null,
        closePrevious: !!fwdClosePrev,
      });
      setFwdNote("");
      await load();
      alert("تمت الإحالة");
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "فشل الإحالة");
    } finally {
      setActLoading(false);
    }
  }

  function resetFilters() {
    setQInput("");
    setQ("");
    setFrom("");
    setTo("");
    setDeptId("");
    setAssigneeId("");
    setIncomingNumber("");
    setDistributionId("");
    setPage(1);

    // إعادة تعيين فلتر SLA + إزالة ?sla من الـ URL
    setSlaFilter("all");
    const next = new URLSearchParams(searchParams);
    next.delete("sla");
    setSearchParams(next, { replace: true });
  }

  const total = data?.total ?? 0;
  const currentPage = data?.page ?? 1;
  const totalPages = data?.pages ?? 1;

  // تطبيق فلتر SLA على الصفوف (على مستوى الواجهة)
  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    return rows.filter((r) => {
      const slaState = classifySla(r);
      const escalated =
        r.status === "Escalated" ||
        ((r.escalationCount ?? 0) > 0 && slaState !== "NoSla");

      switch (slaFilter) {
        case "noSla":
          return slaState === "NoSla";
        case "onTrack":
          return slaState === "OnTrack";
        case "dueSoon":
          return slaState === "DueSoon";
        case "overdue":
          return slaState === "Overdue";
        case "escalated":
          return escalated;
        case "all":
        default:
          return true;
      }
    });
  }, [data, slaFilter]);

  const handleChangeSlaFilter = (filter: SlaFilter) => {
    setSlaFilter(filter);
    const next = new URLSearchParams(searchParams);
    if (filter === "all") next.delete("sla");
    else next.set("sla", filter);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مكتبي</h1>
          <p className="text-sm text-gray-500 mt-1">
            كل التوزيعات المفتوحة/تحت الإجراء المرتبطة بك أو بإدارتك/قسمك، مع
            إبراز حالة الالتزام بالـ SLA لكل معاملة.
          </p>
        </div>
      </header>

      {/* فلاتر أعلى الجدول */}
      <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-3">
        <div className="grid lg:grid-cols-8 sm:grid-cols-3 grid-cols-1 gap-3 text-sm">
          <div className="lg:col-span-2">
            <label className="text-xs text-gray-500">بحث (رقم/عنوان/جهة)</label>
            <input
              className="w-full border rounded-xl p-2"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="..."
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">من تاريخ</label>
            <input
              className="w-full border rounded-xl p-2"
              type="date"
              value={from}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">إلى تاريخ</label>
            <input
              className="w-full border rounded-xl p-2"
              type="date"
              value={to}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">الإدارة/القسم</label>
            <select
              className="w-full border rounded-xl p-2 bg-white"
              value={deptId}
              onChange={(e) => {
                setPage(1);
                setDeptId(e.target.value);
              }}
            >
              <option value="">الكل</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">المكلّف</label>
            <select
              className="w-full border rounded-xl p-2 bg-white"
              value={assigneeId}
              onChange={(e) => {
                setPage(1);
                setAssigneeId(e.target.value);
              }}
              disabled={!deptId || loadingUsersFilter}
            >
              <option value="">
                {loadingUsersFilter ? "جاري التحميل..." : "الكل"}
              </option>
              {usersFilter.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">رقم الوارد</label>
            <input
              className="w-full border rounded-xl p-2"
              value={incomingNumber}
              onChange={(e) => {
                setPage(1);
                setIncomingNumber(e.target.value);
              }}
              placeholder="مثال: 2025/000123"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">رقم التوزيع</label>
            <input
              className="w-full border rounded-xl p-2"
              value={distributionId}
              onChange={(e) => {
                setPage(1);
                setDistributionId(e.target.value);
              }}
              placeholder="ID"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <button
              onClick={() => load()}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 min-w-[110px] whitespace-nowrap shrink-0"
            >
              تحديث
            </button>
            <button
              onClick={resetFilters}
              className="w-full sm:w-auto border rounded-xl px-4 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 min-w-[110px] whitespace-nowrap shrink-0"
            >
              إعادة تعيين
            </button>
          </div>
        </div>

        {/* أزرار فلتر SLA */}
        <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
          <span className="text-gray-500">عرض حسب حالة SLA:</span>
          {(
            [
              ["all", "الكل"],
              ["noSla", "بدون SLA"],
              ["onTrack", "على المسار الصحيح"],
              ["dueSoon", "قريبة من الانتهاء"],
              ["overdue", "متأخرة"],
              ["escalated", "تم تصعيدها"],
            ] as [SlaFilter, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => handleChangeSlaFilter(val)}
              className={[
                "px-3 py-1 rounded-full border text-xs",
                slaFilter === val
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-gray-500 mt-1">
          يعتمد التصنيف على حقل <span className="font-mono">dueAt</span> ووقت
          النظام الحالي، مع اعتبار أي معاملة بعد موعد الاستحقاق كـ "متأخرة"،
          وأي معاملة خلال 24 ساعة القادمة كـ "قريبة من الانتهاء".
        </div>
      </section>

      {slaSummary && (
        <section className="bg-white border rounded-2xl shadow-sm p-4 mb-4" dir="rtl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">ملخّص SLA لمكتبي</h3>
            {loadingSlaSummary && (
              <span className="text-xs text-gray-500">جارِ التحديث...</span>
            )}
          </div>

          <div className="grid sm:grid-cols-5 gap-3 text-sm">
            <div className="rounded-xl border p-3 bg-gray-50">
              <div className="text-xs text-gray-500 mb-1">إجمالي المعاملات</div>
              <div className="text-lg font-bold">{slaSummary.total}</div>
            </div>

            <div className="rounded-xl border p-3 bg-emerald-50">
              <div className="text-xs text-gray-500 mb-1">ضمن الوقت</div>
              <div className="text-lg font-bold">{slaSummary.onTrack}</div>
            </div>

            <div className="rounded-xl border p-3 bg-amber-50">
              <div className="text-xs text-gray-500 mb-1">قريبة من الانتهاء</div>
              <div className="text-lg font-bold">{slaSummary.dueSoon}</div>
            </div>

            <div className="rounded-xl border p-3 bg-red-50">
              <div className="text-xs text-gray-500 mb-1">متأخرة</div>
              <div className="text-lg font-bold">{slaSummary.overdue}</div>
            </div>

            <div className="rounded-xl border p-3 bg-rose-50">
              <div className="text-xs text-gray-500 mb-1">تم التصعيد</div>
              <div className="text-lg font-bold">{slaSummary.escalated}</div>
            </div>
          </div>

          <div className="text-[11px] text-gray-500 mt-2">
            * يُحتسب الملخّص فقط للمعاملات بحالة Open / InProgress / Escalated.
          </div>
        </section>
      )}

      {/* جدول */}
      <section className="bg-white border rounded-2xl shadow-sm p-4">
        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        {loading ? (
          <div className="text-sm text-gray-500">...جاري التحميل</div>
        ) : (
          <>
            <div className="overflow-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-right"># توزيع</th>
                    <th className="p-2 text-right">رقم الوارد</th>
                    <th className="p-2 text-right">عنوان الوثيقة</th>
                    <th className="p-2 text-right">الجهة</th>
                    <th className="p-2 text-right">تاريخ الاستلام</th>
                    <th className="p-2 text-right">تاريخ الاستحقاق</th>
                    <th className="p-2 text-right">الأولوية</th>
                    <th className="p-2 text-right">التصعيدات</th>
                    <th className="p-2 text-right">الحالة</th>
                    <th className="p-2 text-right">آخر تحديث</th>
                    <th className="p-2 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length ? (
                    filteredRows.map((r) => {
                      const priority =
                        typeof r.priority === "number" &&
                        Number.isFinite(r.priority)
                          ? r.priority
                          : 0;
                      const escCount =
                        typeof r.escalationCount === "number" &&
                        Number.isFinite(r.escalationCount)
                          ? r.escalationCount
                          : 0;
                      const overdue = isOverdue(r);
                      const slaState = classifySla(r);

                      return (
                        <tr
                          key={r.distributionId}
                          className={
                            "border-t " + (overdue ? "bg-rose-50" : "")
                          }
                        >
                          <td className="p-2">{r.distributionId}</td>
                          <td className="p-2">
                            {r.incomingId ? (
                              <Link
                                className="text-blue-600 hover:underline font-mono"
                                to={`/incoming/${r.incomingId}`}
                              >
                                {r.incomingNumber ?? r.incomingId}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-2">{r.document?.title ?? "—"}</td>
                          <td className="p-2">
                            {r.externalPartyName ?? "—"}
                          </td>
                          <td className="p-2">{fmtDT(r.receivedDate)}</td>
                          <td className="p-2">{fmtDT(r.dueAt)}</td>
                          <td className="p-2">{priority}</td>
                          <td className="p-2">{escCount}</td>
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${badgeCls(
                                r.status
                              )}`}
                            >
                              {r.status}
                              {slaState === "DueSoon" && (
                                <span className="mr-1 text-[10px] text-amber-700">
                                  (قريبة من الانتهاء)
                                </span>
                              )}
                              {overdue && (
                                <span className="mr-1 text-[10px] text-rose-700">
                                  (متأخرة)
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="p-2">{fmtDT(r.lastUpdateAt)}</td>
                          <td className="p-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => {
                                  setStatusDistId(r.distributionId);
                                  setStatusNew("InProgress");
                                  setStatusNote("");
                                }}
                                className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
                              >
                                حالة
                              </button>
                              <button
                                onClick={() => {
                                  setAssignDistId(r.distributionId);
                                  setAssignDept("");
                                  setAssignUser("");
                                  setAssignNote("");
                                }}
                                className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
                              >
                                تعيين
                              </button>
                              <button
                                onClick={() => {
                                  setFwdIncomingId(r.incomingId);
                                  setFwdDept("");
                                  setFwdUser("");
                                  setFwdClosePrev(true);
                                  setFwdNote("");
                                }}
                                className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
                              >
                                إحالة
                              </button>
                              <Link
                                to={`/incoming/${r.incomingId}`}
                                className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
                              >
                                عرض
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-4 text-center text-gray-500">
                        لا توجد عناصر
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* صفحات */}
            <div className="flex items-center justify-between mt-3 text-sm">
              <div>الإجمالي: {total}</div>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border px-3 py-1 disabled:opacity-50"
                >
                  السابق
                </button>
                <span>
                  صفحة {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage((p) =>
                      totalPages ? Math.min(totalPages, p + 1) : p + 1
                    )
                  }
                  className="rounded-lg border px-3 py-1 disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* نماذج صغيرة سريعة */} 
      {/* (الكود أدناه كما كان بدون تغييرات) */}

      <section className="grid md:grid-cols-3 gap-4">
        {/* تغيير الحالة */}
        <form
          onSubmit={applyStatus}
          className="bg-white border rounded-2xl shadow-sm p-4 space-y-2"
        >
          <div className="font-semibold">تغيير حالة توزيع</div>
          <div>
            <label className="text-xs text-gray-500"># توزيع</label>
            <input
              className="w-full border rounded-xl p-2"
              value={statusDistId}
              onChange={(e) => setStatusDistId(e.target.value)}
              placeholder="رقم التوزيع"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">الحالة الجديدة</label>
            <select
              className="w-full border rounded-xl p-2 bg-white"
              value={statusNew}
              onChange={(e) => setStatusNew(e.target.value as any)}
            >
              <option value="Open">Open</option>
              <option value="InProgress">InProgress</option>
              <option value="Closed">Closed</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">ملاحظة</label>
            <input
              className="w-full border rounded-xl p-2"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="اختياري"
            />
          </div>
          <div>
            <button
              disabled={actLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
            >
              {actLoading ? "..." : "تطبيق الحالة"}
            </button>
          </div>
        </form>

        {/* تعيين مكلّف */}
        <form
          onSubmit={applyAssign}
          className="bg-white border rounded-2xl shadow-sm p-4 space-y-2"
        >
          <div className="font-semibold">تعيين مكلّف</div>

          <div>
            <label className="text-xs text-gray-500"># توزيع</label>
            <input
              className="w-full border rounded-xl p-2"
              value={assignDistId}
              onChange={(e) => setAssignDistId(e.target.value)}
              placeholder="رقم التوزيع"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">الإدارة</label>
            <select
              className="w-full border rounded-xl p-2 bg-white"
              value={assignDept}
              onChange={(e) => setAssignDept(e.target.value)}
            >
              <option value="">اختر قسمًا</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">المكلّف</label>
            <select
              className="w-full border rounded-xl p-2 bg-white"
              value={assignUser}
              onChange={(e) => setAssignUser(e.target.value)}
              disabled={!assignDept || assignUsersLoading}
            >
              <option value="">
                {assignUsersLoading ? "جاري التحميل..." : "اختر مستخدمًا"}
              </option>
              {assignUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">ملاحظة</label>
            <input
              className="w-full border rounded-xl p-2"
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              placeholder="اختياري"
            />
          </div>

          <div>
            <button
              disabled={actLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
            >
              {actLoading ? "..." : "تطبيق التعيين"}
            </button>
          </div>
        </form>

        {/* إحالة وارد */}
        <form
          onSubmit={applyForward}
          className="bg-white border rounded-2xl shadow-sm p-4 space-y-2"
        >
          <div className="font-semibold">إحالة وارد</div>

          <div>
            <label className="text-xs text-gray-500"># الوارد</label>
            <input
              className="w-full border rounded-xl p-2"
              value={fwdIncomingId}
              onChange={(e) => setFwdIncomingId(e.target.value)}
              placeholder="رقم الوارد"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">القسم المستهدف</label>
            <select
              className="w-full border rounded-xl p-2 bg-white"
              value={fwdDept}
              onChange={(e) => setFwdDept(e.target.value)}
            >
              <option value="">اختر قسمًا</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">المكلّف (اختياري)</label>
            <select
              className="w-full border rounded-xl p-2 bg-white"
              value={fwdUser}
              onChange={(e) => setFwdUser(e.target.value)}
              disabled={!fwdDept || fwdUsersLoading}
            >
              <option value="">
                {fwdUsersLoading ? "جاري التحميل..." : "—"}
              </option>
              {fwdUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="closePrev"
              type="checkbox"
              checked={fwdClosePrev}
              onChange={(e) => setFwdClosePrev(e.target.checked)}
            />
            <label htmlFor="closePrev" className="text-sm">
              إغلاق التوزيع السابق تلقائيًا
            </label>
          </div>

          <div>
            <label className="text-xs text-gray-500">ملاحظة</label>
            <input
              className="w-full border rounded-xl p-2"
              value={fwdNote}
              onChange={(e) => setFwdNote(e.target.value)}
              placeholder="اختياري"
            />
          </div>

          <div>
            <button
              disabled={actLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
            >
              {actLoading ? "..." : "تنفيذ الإحالة"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}




// // src/pages/MyDeskPage.tsx

// import { useEffect, useMemo, useRef, useState } from "react";
// import { Link } from "react-router-dom";
// import api from "../api/apiClient";
// import { toast } from "sonner";

// type Dept = { id: number; name: string; status?: string };
// type UserLite = { id: number; fullName: string; departmentId: number | null };

// type Row = {
//   id: string; // distributionId أو PK داخلي
//   distributionId: string;
//   status: "Open" | "InProgress" | "Closed" | "Escalated";
//   lastUpdateAt?: string;
//   incomingId: string;
//   incomingNumber?: string;
//   receivedDate?: string;
//   externalPartyName?: string;
//   document?: { id: string; title: string } | null;

//   // حقول SLA / تصعيد
//   dueAt?: string | null;
//   priority?: number | null;
//   escalationCount?: number | null;
// };

// type Resp = {
//   page: number;
//   pageSize: number;
//   total: number;
//   pages: number;
//   rows: Row[];
// };

// type SlaSummary = {
//   total: number;
//   noSla: number;
//   onTrack: number;
//   dueSoon: number;
//   overdue: number;
//   escalated: number;
// };

// function fmtDT(v?: string | null) {
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

// function badgeCls(status: Row["status"]) {
//   switch (status) {
//     case "Open":
//       return "bg-blue-100 text-blue-700";
//     case "InProgress":
//       return "bg-amber-100 text-amber-700";
//     case "Closed":
//       return "bg-emerald-100 text-emerald-700";
//     default:
//       return "bg-rose-100 text-rose-700";
//   }
// }

// function isOverdue(r: Row) {
//   if (!r.dueAt) return false;
//   if (r.status === "Closed") return false;
//   const d = new Date(r.dueAt);
//   if (isNaN(d.getTime())) return false;
//   return d.getTime() < Date.now();
// }

// type Bucket = "all" | "overdue" | "today" | "week" | "escalated";

// export default function MyDeskPage() {
//   // فلاتر نص/تاريخ
//   const [qInput, setQInput] = useState("");
//   const [q, setQ] = useState(""); // debounced value
//   const [from, setFrom] = useState(""); // YYYY-MM-DD
//   const [to, setTo] = useState(""); // YYYY-MM-DD
//   const [page, setPage] = useState(1);
//   const [pageSize] = useState(20);

//   // فلاتر جديدة (أعلى الجدول)
//   const [deptId, setDeptId] = useState<string>("");
//   const [assigneeId, setAssigneeId] = useState<string>("");
//   const [incomingNumber, setIncomingNumber] = useState("");
//   const [distributionId, setDistributionId] = useState("");

//   // فلتر "منظور" مكتبي (SLA)
//   const [bucket, setBucket] = useState<Bucket>("all");

//   // مصادر القوائم
//   const [departments, setDepartments] = useState<Dept[]>([]);
//   const [usersFilter, setUsersFilter] = useState<UserLite[]>([]);
//   const [loadingUsersFilter, setLoadingUsersFilter] = useState(false);

//   // بيانات الجدول
//   const [data, setData] = useState<Resp | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   // ملخص SLA
//   const [slaSummary, setSlaSummary] = useState<SlaSummary | null>(null);
//   const [loadingSlaSummary, setLoadingSlaSummary] = useState(false);

//   // ===== Debounce لحقل البحث =====
//   useEffect(() => {
//     const t = setTimeout(() => {
//       setPage(1);
//       setQ(qInput.trim());
//     }, 350);
//     return () => clearTimeout(t);
//   }, [qInput]);

//   // تحميل الإدارات مرة واحدة
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await api.get<Dept[]>("/departments", {
//           params: { status: "Active" },
//         });
//         setDepartments(Array.isArray(res.data) ? res.data : []);
//       } catch {
//         // تجاهل الخطأ في الفلتر فقط
//       }
//     })();
//   }, []);

//   // تحميل المستخدمين لفلتر أعلى الجدول عند تغيير deptId (اختياري)
//   useEffect(() => {
//     (async () => {
//       setUsersFilter([]);
//       setAssigneeId("");
//       if (!deptId) return;
//       setLoadingUsersFilter(true);
//       try {
//         const res = await api.get<UserLite[]>(`/users/by-department/${deptId}`);
//         setUsersFilter(Array.isArray(res.data) ? res.data : []);
//       } catch {
//         // تجاهل
//       } finally {
//         setLoadingUsersFilter(false);
//       }
//     })();
//   }, [deptId]);

//   const params = useMemo(() => {
//     const p = new URLSearchParams();
//     p.set("page", String(page));
//     p.set("pageSize", String(pageSize));
//     if (q) p.set("q", q);
//     if (from) p.set("from", from);
//     if (to) p.set("to", to);
//     if (deptId) p.set("deptId", deptId);
//     if (assigneeId) p.set("assigneeId", assigneeId);
//     if (incomingNumber.trim()) p.set("incomingNumber", incomingNumber.trim());
//     if (distributionId.trim()) p.set("distributionId", distributionId.trim());
//     if (bucket && bucket !== "all") p.set("scope", bucket);
//     return p.toString();
//   }, [
//     page,
//     pageSize,
//     q,
//     from,
//     to,
//     deptId,
//     assigneeId,
//     incomingNumber,
//     distributionId,
//     bucket,
//   ]);

//   // إلغاء الطلب السابق عند تغيّر المعاملات
//   const abortRef = useRef<AbortController | null>(null);

//   async function load() {
//     abortRef.current?.abort();
//     const ctrl = new AbortController();
//     abortRef.current = ctrl;

//     setErr(null);
//     setLoading(true);
//     try {
//       const res = await api.get<Resp>(`/incoming/my-desk?${params}`, {
//         signal: ctrl.signal as any,
//       });
//       setData(res.data);
//     } catch (e: any) {
//       // تجاهل الإلغاء
//       if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
//         setErr(e?.response?.data?.message ?? "فشل تحميل البيانات");
//       }
//     } finally {
//       setLoading(false);
//     }
//   }

//   // تحميل ملخص SLA لمكتبي
//   useEffect(() => {
//     (async () => {
//       setLoadingSlaSummary(true);
//       try {
//         const res = await api.get<{
//           success: boolean;
//           data?: SlaSummary;
//           error?: { code: string; message: string };
//         }>("/incoming/my-desk/sla-summary");

//         if (res.data?.success && res.data.data) {
//           setSlaSummary(res.data.data);
//         } else {
//           toast.error(
//             res.data?.error?.message ||
//               "تعذّر تحميل ملخّص الـ SLA لمكتبي"
//           );
//         }
//       } catch (e: any) {
//         toast.error("خطأ أثناء تحميل ملخّص الـ SLA");
//       } finally {
//         setLoadingSlaSummary(false);
//       }
//     })();
//   }, []);

//   useEffect(() => {
//     load();
//     // إلغاء عند التفكيك
//     return () => abortRef.current?.abort();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [params]);

//   // ==== إجراءات سريعة (نماذج سفليّة) ====
//   const [actLoading, setActLoading] = useState(false);

//   // تغيير الحالة
//   const [statusDistId, setStatusDistId] = useState<string>("");
//   const [statusNew, setStatusNew] =
//     useState<"Open" | "InProgress" | "Closed" | "Escalated">("InProgress");
//   const [statusNote, setStatusNote] = useState("");

//   // تعيين مكلّف — (قائمة مستقلة عن فلاتر أعلى الجدول)
//   const [assignDistId, setAssignDistId] = useState<string>("");
//   const [assignDept, setAssignDept] = useState<string>("");
//   const [assignUsers, setAssignUsers] = useState<UserLite[]>([]);
//   const [assignUsersLoading, setAssignUsersLoading] = useState(false);
//   const [assignUser, setAssignUser] = useState<string>("");
//   const [assignNote, setAssignNote] = useState("");

//   useEffect(() => {
//     (async () => {
//       setAssignUsers([]);
//       setAssignUser("");
//       if (!assignDept) return;
//       setAssignUsersLoading(true);
//       try {
//         const res = await api.get<UserLite[]>(
//           `/users/by-department/${assignDept}`
//         );
//         setAssignUsers(Array.isArray(res.data) ? res.data : []);
//       } catch {
//         // تجاهل
//       } finally {
//         setAssignUsersLoading(false);
//       }
//     })();
//   }, [assignDept]);

//   // إحالة وارد — (قائمة مستخدمين مستقلّة عن فلاتر أعلى الجدول)
//   const [fwdIncomingId, setFwdIncomingId] = useState<string>("");
//   const [fwdDept, setFwdDept] = useState<string>("");
//   const [fwdUsers, setFwdUsers] = useState<UserLite[]>([]);
//   const [fwdUsersLoading, setFwdUsersLoading] = useState(false);
//   const [fwdUser, setFwdUser] = useState<string>("");
//   const [fwdClosePrev, setFwdClosePrev] = useState(true);
//   const [fwdNote, setFwdNote] = useState("");

//   useEffect(() => {
//     (async () => {
//       setFwdUsers([]);
//       setFwdUser("");
//       if (!fwdDept) return;
//       setFwdUsersLoading(true);
//       try {
//         const res = await api.get<UserLite[]>(`/users/by-department/${fwdDept}`);
//         setFwdUsers(Array.isArray(res.data) ? res.data : []);
//       } catch {
//         // تجاهل
//       } finally {
//         setFwdUsersLoading(false);
//       }
//     })();
//   }, [fwdDept]);

//   async function applyStatus(e: React.FormEvent) {
//     e.preventDefault();
//     if (!statusDistId) return alert("أدخل رقم توزيع صحيح");
//     setActLoading(true);
//     try {
//       await api.patch(`/incoming/distributions/${statusDistId}/status`, {
//         status: statusNew,
//         note: statusNote || null,
//       });
//       setStatusNote("");
//       await load();
//       alert("تم تحديث الحالة");
//     } catch (e: any) {
//       alert(e?.response?.data?.message ?? "فشل تغيير الحالة");
//     } finally {
//       setActLoading(false);
//     }
//   }

//   async function applyAssign(e: React.FormEvent) {
//     e.preventDefault();
//     if (!assignDistId) return alert("أدخل رقم توزيع صحيح");
//     if (!assignDept) return alert("اختر الإدارة أولًا");
//     if (!assignUser) return alert("اختر المكلّف");
//     setActLoading(true);
//     try {
//       await api.patch(`/incoming/distributions/${assignDistId}/assign`, {
//         assignedToUserId: Number(assignUser),
//         note: assignNote || null,
//       });
//       setAssignNote("");
//       await load();
//       alert("تم التعيين");
//     } catch (e: any) {
//       alert(e?.response?.data?.message ?? "فشل التعيين");
//     } finally {
//       setActLoading(false);
//     }
//   }

//   async function applyForward(e: React.FormEvent) {
//     e.preventDefault();
//     if (!fwdIncomingId) return alert("أدخل رقم الوارد");
//     if (!fwdDept) return alert("اختر القسم المستهدف");
//     setActLoading(true);
//     try {
//       await api.post(`/incoming/${fwdIncomingId}/forward`, {
//         targetDepartmentId: Number(fwdDept),
//         assignedToUserId: fwdUser ? Number(fwdUser) : undefined,
//         note: fwdNote || null,
//         closePrevious: !!fwdClosePrev,
//       });
//       setFwdNote("");
//       await load();
//       alert("تمت الإحالة");
//     } catch (e: any) {
//       alert(e?.response?.data?.message ?? "فشل الإحالة");
//     } finally {
//       setActLoading(false);
//     }
//   }

//   function resetFilters() {
//     setQInput("");
//     setQ("");
//     setFrom("");
//     setTo("");
//     setDeptId("");
//     setAssigneeId("");
//     setIncomingNumber("");
//     setDistributionId("");
//     setBucket("all");
//     setPage(1);
//   }

//   const total = data?.total ?? 0;
//   const currentPage = data?.page ?? 1;
//   const totalPages = data?.pages ?? 1;

//   return (
//     <div className="space-y-6" dir="rtl">
//       <header className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">مكتبي</h1>
//           <p className="text-sm text-gray-500 mt-1">
//             كل التوزيعات المفتوحة/تحت الإجراء المرتبطة بك أو بإدارتك/قسمك، مع
//             إبراز المتأخر منها بناءً على تاريخ الاستحقاق (SLA).
//           </p>
//         </div>
//       </header>

//       {/* فلاتر أعلى الجدول */}
//       <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-3">
//         <div className="grid lg:grid-cols-8 sm:grid-cols-3 grid-cols-1 gap-3 text-sm">
//           <div className="lg:col-span-2">
//             <label className="text-xs text-gray-500">بحث (رقم/عنوان/جهة)</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={qInput}
//               onChange={(e) => setQInput(e.target.value)}
//               placeholder="..."
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">من تاريخ</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               type="date"
//               value={from}
//               onChange={(e) => {
//                 setPage(1);
//                 setFrom(e.target.value);
//               }}
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">إلى تاريخ</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               type="date"
//               value={to}
//               onChange={(e) => {
//                 setPage(1);
//                 setTo(e.target.value);
//               }}
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">الإدارة/القسم</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={deptId}
//               onChange={(e) => {
//                 setPage(1);
//                 setDeptId(e.target.value);
//               }}
//             >
//               <option value="">الكل</option>
//               {departments.map((d) => (
//                 <option key={d.id} value={d.id}>
//                   {d.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">المكلّف</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={assigneeId}
//               onChange={(e) => {
//                 setPage(1);
//                 setAssigneeId(e.target.value);
//               }}
//               disabled={!deptId || loadingUsersFilter}
//             >
//               <option value="">
//                 {loadingUsersFilter ? "جاري التحميل..." : "الكل"}
//               </option>
//               {usersFilter.map((u) => (
//                 <option key={u.id} value={u.id}>
//                   {u.fullName}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">رقم الوارد</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={incomingNumber}
//               onChange={(e) => {
//                 setPage(1);
//                 setIncomingNumber(e.target.value);
//               }}
//               placeholder="مثال: 2025/000123"
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">رقم التوزيع</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={distributionId}
//               onChange={(e) => {
//                 setPage(1);
//                 setDistributionId(e.target.value);
//               }}
//               placeholder="ID"
//             />
//           </div>

//           <div className="flex flex-col sm:flex-row sm:items-end gap-2">
//             <button
//               onClick={() => load()}
//               className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 min-w-[110px] whitespace-nowrap shrink-0"
//             >
//               تحديث
//             </button>
//             <button
//               onClick={resetFilters}
//               className="w-full sm:w-auto border rounded-xl px-4 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 min-w-[110px] whitespace-nowrap shrink-0"
//             >
//               إعادة تعيين
//             </button>
//           </div>
//         </div>

//         {/* أزرار منظور SLA السريع */}
//         <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
//           <span className="text-gray-500">عرض سريع حسب تاريخ الاستحقاق:</span>
//           {(
//             [
//               ["all", "الكل"],
//               ["overdue", "متأخرة"],
//               ["today", "مستحقة اليوم"],
//               ["week", "هذا الأسبوع"],
//               ["escalated", "تم تصعيدها"],
//             ] as [Bucket, string][]
//           ).map(([b, label]) => (
//             <button
//               key={b}
//               onClick={() => {
//                 setPage(1);
//                 setBucket(b);
//               }}
//               className={[
//                 "px-3 py-1 rounded-full border text-xs",
//                 bucket === b
//                   ? "bg-blue-600 text-white border-blue-600"
//                   : "bg-white text-gray-700 hover:bg-gray-50",
//               ].join(" ")}
//             >
//               {label}
//             </button>
//           ))}
//         </div>
//         <div className="text-[11px] text-gray-500 mt-1">
//           يتم الاعتماد على حقل <span className="font-mono">dueAt</span> من
//           التوزيع (SLA). التوزيعات المغلقة لا تُعتبر متأخرة حتى لو كان تاريخ
//           الاستحقاق قد مضى.
//         </div>
//       </section>

//       {slaSummary && (
//         <section className="bg-white border rounded-2xl shadow-sm p-4 mb-4" dir="rtl">
//           <div className="flex items-center justify-between mb-3">
//             <h3 className="text-sm font-semibold">ملخّص SLA لمكتبي</h3>
//             {loadingSlaSummary && (
//               <span className="text-xs text-gray-500">جارِ التحديث...</span>
//             )}
//           </div>

//           <div className="grid sm:grid-cols-5 gap-3 text-sm">
//             <div className="rounded-xl border p-3 bg-gray-50">
//               <div className="text-xs text-gray-500 mb-1">إجمالي المعاملات</div>
//               <div className="text-lg font-bold">{slaSummary.total}</div>
//             </div>

//             <div className="rounded-xl border p-3 bg-emerald-50">
//               <div className="text-xs text-gray-500 mb-1">ضمن الوقت</div>
//               <div className="text-lg font-bold">{slaSummary.onTrack}</div>
//             </div>

//             <div className="rounded-xl border p-3 bg-amber-50">
//               <div className="text-xs text-gray-500 mb-1">قريبة من الانتهاء</div>
//               <div className="text-lg font-bold">{slaSummary.dueSoon}</div>
//             </div>

//             <div className="rounded-xl border p-3 bg-red-50">
//               <div className="text-xs text-gray-500 mb-1">متأخرة</div>
//               <div className="text-lg font-bold">{slaSummary.overdue}</div>
//             </div>

//             <div className="rounded-xl border p-3 bg-rose-50">
//               <div className="text-xs text-gray-500 mb-1">تم التصعيد</div>
//               <div className="text-lg font-bold">{slaSummary.escalated}</div>
//             </div>
//           </div>

//           <div className="text-[11px] text-gray-500 mt-2">
//             * يُحتسب الملخّص فقط للمعاملات بحالة Open / InProgress / Escalated.
//           </div>
//         </section>
//       )}

//       {/* جدول */}
//       <section className="bg-white border rounded-2xl shadow-sm p-4">
//         {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
//         {loading ? (
//           <div className="text-sm text-gray-500">...جاري التحميل</div>
//         ) : (
//           <>
//             <div className="overflow-auto rounded-xl border">
//               <table className="min-w-full text-sm">
//                 <thead>
//                   <tr className="bg-gray-100">
//                     <th className="p-2 text-right"># توزيع</th>
//                     <th className="p-2 text-right">رقم الوارد</th>
//                     <th className="p-2 text-right">عنوان الوثيقة</th>
//                     <th className="p-2 text-right">الجهة</th>
//                     <th className="p-2 text-right">تاريخ الاستلام</th>
//                     <th className="p-2 text-right">تاريخ الاستحقاق</th>
//                     <th className="p-2 text-right">الأولوية</th>
//                     <th className="p-2 text-right">التصعيدات</th>
//                     <th className="p-2 text-right">الحالة</th>
//                     <th className="p-2 text-right">آخر تحديث</th>
//                     <th className="p-2 text-right">إجراءات</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {data?.rows?.length ? (
//                     data.rows.map((r) => {
//                       const priority =
//                         typeof r.priority === "number" &&
//                         Number.isFinite(r.priority)
//                           ? r.priority
//                           : 0;
//                       const escCount =
//                         typeof r.escalationCount === "number" &&
//                         Number.isFinite(r.escalationCount)
//                           ? r.escalationCount
//                           : 0;
//                       const overdue = isOverdue(r);

//                       return (
//                         <tr
//                           key={r.distributionId}
//                           className={
//                             "border-t " + (overdue ? "bg-rose-50" : "")
//                           }
//                         >
//                           <td className="p-2">{r.distributionId}</td>
//                           <td className="p-2">
//                             {r.incomingId ? (
//                               <Link
//                                 className="text-blue-600 hover:underline font-mono"
//                                 to={`/incoming/${r.incomingId}`}
//                               >
//                                 {r.incomingNumber ?? r.incomingId}
//                               </Link>
//                             ) : (
//                               "—"
//                             )}
//                           </td>
//                           <td className="p-2">{r.document?.title ?? "—"}</td>
//                           <td className="p-2">
//                             {r.externalPartyName ?? "—"}
//                           </td>
//                           <td className="p-2">{fmtDT(r.receivedDate)}</td>
//                           <td className="p-2">{fmtDT(r.dueAt)}</td>
//                           <td className="p-2">{priority}</td>
//                           <td className="p-2">{escCount}</td>
//                           <td className="p-2">
//                             <span
//                               className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${badgeCls(
//                                 r.status
//                               )}`}
//                             >
//                               {r.status}
//                               {overdue && (
//                                 <span className="ml-1 text-[10px] text-rose-700">
//                                   (متأخرة)
//                                 </span>
//                               )}
//                             </span>
//                           </td>
//                           <td className="p-2">{fmtDT(r.lastUpdateAt)}</td>
//                           <td className="p-2">
//                             <div className="flex flex-wrap items-center gap-2">
//                               <button
//                                 onClick={() => {
//                                   setStatusDistId(r.distributionId);
//                                   setStatusNew("InProgress");
//                                   setStatusNote("");
//                                 }}
//                                 className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
//                               >
//                                 حالة
//                               </button>
//                               <button
//                                 onClick={() => {
//                                   setAssignDistId(r.distributionId);
//                                   setAssignDept("");
//                                   setAssignUser("");
//                                   setAssignNote("");
//                                 }}
//                                 className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
//                               >
//                                 تعيين
//                               </button>
//                               <button
//                                 onClick={() => {
//                                   setFwdIncomingId(r.incomingId);
//                                   setFwdDept("");
//                                   setFwdUser("");
//                                   setFwdClosePrev(true);
//                                   setFwdNote("");
//                                 }}
//                                 className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
//                               >
//                                 إحالة
//                               </button>
//                               <Link
//                                 to={`/incoming/${r.incomingId}`}
//                                 className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
//                               >
//                                 عرض
//                               </Link>
//                             </div>
//                           </td>
//                         </tr>
//                       );
//                     })
//                   ) : (
//                     <tr>
//                       <td colSpan={11} className="p-4 text-center text-gray-500">
//                         لا توجد عناصر
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>

//             {/* صفحات */}
//             <div className="flex items-center justify-between mt-3 text-sm">
//               <div>الإجمالي: {total}</div>
//               <div className="flex items-center gap-2">
//                 <button
//                   disabled={currentPage <= 1}
//                   onClick={() => setPage((p) => Math.max(1, p - 1))}
//                   className="rounded-lg border px-3 py-1 disabled:opacity-50"
//                 >
//                   السابق
//                 </button>
//                 <span>
//                   صفحة {currentPage} / {totalPages}
//                 </span>
//                 <button
//                   disabled={currentPage >= totalPages}
//                   onClick={() =>
//                     setPage((p) =>
//                       totalPages ? Math.min(totalPages, p + 1) : p + 1
//                     )
//                   }
//                   className="rounded-lg border px-3 py-1 disabled:opacity-50"
//                 >
//                   التالي
//                 </button>
//               </div>
//             </div>
//           </>
//         )}
//       </section>

//       {/* نماذج صغيرة سريعة */}
//       <section className="grid md:grid-cols-3 gap-4">
//         {/* تغيير الحالة */}
//         <form
//           onSubmit={applyStatus}
//           className="bg-white border rounded-2xl shadow-sm p-4 space-y-2"
//         >
//           <div className="font-semibold">تغيير حالة توزيع</div>
//           <div>
//             <label className="text-xs text-gray-500"># توزيع</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={statusDistId}
//               onChange={(e) => setStatusDistId(e.target.value)}
//               placeholder="رقم التوزيع"
//             />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">الحالة الجديدة</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={statusNew}
//               onChange={(e) => setStatusNew(e.target.value as any)}
//             >
//               <option value="Open">Open</option>
//               <option value="InProgress">InProgress</option>
//               <option value="Closed">Closed</option>
//               <option value="Escalated">Escalated</option>
//             </select>
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">ملاحظة</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={statusNote}
//               onChange={(e) => setStatusNote(e.target.value)}
//               placeholder="اختياري"
//             />
//           </div>
//           <div>
//             <button
//               disabled={actLoading}
//               className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
//             >
//               {actLoading ? "..." : "تطبيق الحالة"}
//             </button>
//           </div>
//         </form>

//         {/* تعيين مكلّف */}
//         <form
//           onSubmit={applyAssign}
//           className="bg-white border rounded-2xl shadow-sm p-4 space-y-2"
//         >
//           <div className="font-semibold">تعيين مكلّف</div>

//           <div>
//             <label className="text-xs text-gray-500"># توزيع</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={assignDistId}
//               onChange={(e) => setAssignDistId(e.target.value)}
//               placeholder="رقم التوزيع"
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">الإدارة</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={assignDept}
//               onChange={(e) => setAssignDept(e.target.value)}
//             >
//               <option value="">اختر قسمًا</option>
//               {departments.map((d) => (
//                 <option key={d.id} value={d.id}>
//                   {d.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">المكلّف</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={assignUser}
//               onChange={(e) => setAssignUser(e.target.value)}
//               disabled={!assignDept || assignUsersLoading}
//             >
//               <option value="">
//                 {assignUsersLoading ? "جاري التحميل..." : "اختر مستخدمًا"}
//               </option>
//               {assignUsers.map((u) => (
//                 <option key={u.id} value={u.id}>
//                   {u.fullName}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">ملاحظة</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={assignNote}
//               onChange={(e) => setAssignNote(e.target.value)}
//               placeholder="اختياري"
//             />
//           </div>

//           <div>
//             <button
//               disabled={actLoading}
//               className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
//             >
//               {actLoading ? "..." : "تطبيق التعيين"}
//             </button>
//           </div>
//         </form>

//         {/* إحالة وارد */}
//         <form
//           onSubmit={applyForward}
//           className="bg-white border rounded-2xl shadow-sm p-4 space-y-2"
//         >
//           <div className="font-semibold">إحالة وارد</div>

//           <div>
//             <label className="text-xs text-gray-500"># الوارد</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={fwdIncomingId}
//               onChange={(e) => setFwdIncomingId(e.target.value)}
//               placeholder="رقم الوارد"
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">القسم المستهدف</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={fwdDept}
//               onChange={(e) => setFwdDept(e.target.value)}
//             >
//               <option value="">اختر قسمًا</option>
//               {departments.map((d) => (
//                 <option key={d.id} value={d.id}>
//                   {d.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">المكلّف (اختياري)</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={fwdUser}
//               onChange={(e) => setFwdUser(e.target.value)}
//               disabled={!fwdDept || fwdUsersLoading}
//             >
//               <option value="">
//                 {fwdUsersLoading ? "جاري التحميل..." : "—"}
//               </option>
//               {fwdUsers.map((u) => (
//                 <option key={u.id} value={u.id}>
//                   {u.fullName}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="flex items-center gap-2">
//             <input
//               id="closePrev"
//               type="checkbox"
//               checked={fwdClosePrev}
//               onChange={(e) => setFwdClosePrev(e.target.checked)}
//             />
//             <label htmlFor="closePrev" className="text-sm">
//               إغلاق التوزيع السابق تلقائيًا
//             </label>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">ملاحظة</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={fwdNote}
//               onChange={(e) => setFwdNote(e.target.value)}
//               placeholder="اختياري"
//             />
//           </div>

//           <div>
//             <button
//               disabled={actLoading}
//               className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
//             >
//               {actLoading ? "..." : "تنفيذ الإحالة"}
//             </button>
//           </div>
//         </form>
//       </section>
//     </div>
//   );
// }




// // src/pages/MyDeskPage.tsx

// import { useEffect, useMemo, useRef, useState } from "react";
// import { Link } from "react-router-dom";
// import api from "../api/apiClient";

// type Dept = { id: number; name: string; status?: string };
// type UserLite = { id: number; fullName: string; departmentId: number | null };

// type Row = {
//   id: string; // distributionId أو PK داخلي
//   distributionId: string;
//   status: "Open" | "InProgress" | "Closed" | "Escalated";
//   lastUpdateAt?: string;
//   incomingId: string;
//   incomingNumber?: string;
//   receivedDate?: string;
//   externalPartyName?: string;
//   document?: { id: string; title: string } | null;

//   // حقول SLA / تصعيد
//   dueAt?: string | null;
//   priority?: number | null;
//   escalationCount?: number | null;
// };

// type Resp = {
//   page: number;
//   pageSize: number;
//   total: number;
//   pages: number;
//   rows: Row[];
// };

// type SlaSummary = {
//   total: number;
//   noSla: number;
//   onTrack: number;
//   dueSoon: number;
//   overdue: number;
//   escalated: number;
// };

// function fmtDT(v?: string | null) {
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

// function badgeCls(status: Row["status"]) {
//   switch (status) {
//     case "Open":
//       return "bg-blue-100 text-blue-700";
//     case "InProgress":
//       return "bg-amber-100 text-amber-700";
//     case "Closed":
//       return "bg-emerald-100 text-emerald-700";
//     default:
//       return "bg-rose-100 text-rose-700";
//   }
// }

// function isOverdue(r: Row) {
//   if (!r.dueAt) return false;
//   if (r.status === "Closed") return false;
//   const d = new Date(r.dueAt);
//   if (isNaN(d.getTime())) return false;
//   return d.getTime() < Date.now();
// }

// type Bucket = "all" | "overdue" | "today" | "week" | "escalated";

// export default function MyDeskPage() {
//   // فلاتر نص/تاريخ
//   const [qInput, setQInput] = useState("");
//   const [q, setQ] = useState(""); // debounced value
//   const [from, setFrom] = useState(""); // YYYY-MM-DD
//   const [to, setTo] = useState(""); // YYYY-MM-DD
//   const [page, setPage] = useState(1);
//   const [pageSize] = useState(20);

//   // فلاتر جديدة (أعلى الجدول)
//   const [deptId, setDeptId] = useState<string>("");
//   const [assigneeId, setAssigneeId] = useState<string>("");
//   const [incomingNumber, setIncomingNumber] = useState("");
//   const [distributionId, setDistributionId] = useState("");

//   // فلتر "منظور" مكتبي (SLA)
//   const [bucket, setBucket] = useState<Bucket>("all");

//   // مصادر القوائم
//   const [departments, setDepartments] = useState<Dept[]>([]);
//   const [usersFilter, setUsersFilter] = useState<UserLite[]>([]);
//   const [loadingUsersFilter, setLoadingUsersFilter] = useState(false);

//   // بيانات الجدول
//   const [data, setData] = useState<Resp | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   // ===== Debounce لحقل البحث =====
//   useEffect(() => {
//     const t = setTimeout(() => {
//       setPage(1);
//       setQ(qInput.trim());
//     }, 350);
//     return () => clearTimeout(t);
//   }, [qInput]);

//   // تحميل الإدارات مرة واحدة
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await api.get<Dept[]>("/departments", {
//           params: { status: "Active" },
//         });
//         setDepartments(Array.isArray(res.data) ? res.data : []);
//       } catch {
//         // تجاهل الخطأ في الفلتر فقط
//       }
//     })();
//   }, []);

//   // تحميل المستخدمين لفلتر أعلى الجدول عند تغيير deptId (اختياري)
//   useEffect(() => {
//     (async () => {
//       setUsersFilter([]);
//       setAssigneeId("");
//       if (!deptId) return;
//       setLoadingUsersFilter(true);
//       try {
//         const res = await api.get<UserLite[]>(`/users/by-department/${deptId}`);
//         setUsersFilter(Array.isArray(res.data) ? res.data : []);
//       } catch {
//         // تجاهل
//       } finally {
//         setLoadingUsersFilter(false);
//       }
//     })();
//   }, [deptId]);

//   const params = useMemo(() => {
//     const p = new URLSearchParams();
//     p.set("page", String(page));
//     p.set("pageSize", String(pageSize));
//     if (q) p.set("q", q);
//     if (from) p.set("from", from);
//     if (to) p.set("to", to);
//     if (deptId) p.set("deptId", deptId);
//     if (assigneeId) p.set("assigneeId", assigneeId);
//     if (incomingNumber.trim()) p.set("incomingNumber", incomingNumber.trim());
//     if (distributionId.trim()) p.set("distributionId", distributionId.trim());
//     // if (bucket && bucket !== "all") p.set("bucket", bucket); // 👈 فلتر SLA
//     if (bucket && bucket !== "all") p.set("scope", bucket);
//     return p.toString();
//   }, [
//     page,
//     pageSize,
//     q,
//     from,
//     to,
//     deptId,
//     assigneeId,
//     incomingNumber,
//     distributionId,
//     bucket,
//   ]);

//   // إلغاء الطلب السابق عند تغيّر المعاملات
//   const abortRef = useRef<AbortController | null>(null);

//   async function load() {
//     abortRef.current?.abort();
//     const ctrl = new AbortController();
//     abortRef.current = ctrl;

//     setErr(null);
//     setLoading(true);
//     try {
//       const res = await api.get<Resp>(`/incoming/my-desk?${params}`, {
//         signal: ctrl.signal as any,
//       });
//       setData(res.data);
//     } catch (e: any) {
//       // تجاهل الإلغاء
//       if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
//         setErr(e?.response?.data?.message ?? "فشل تحميل البيانات");
//       }
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     (async () => {
//       setLoadingSlaSummary(true);
//       try {
//         const res = await api.get<SlaSummary>("/incoming/my-desk/sla-summary");
//         if (res) {
//           setSlaSummary(res.data);
//         } else {
//           toast.error("تعذّر تحميل ملخص الـ SLA لمكتبي");
//         }
//       } catch {
//         toast.error("خطأ أثناء تحميل ملخص الـ SLA");
//       } finally {
//         setLoadingSlaSummary(false);
//       }
//     })();
//   }, []);

//   useEffect(() => {
//     load();
//     // إلغاء عند التفكيك
//     return () => abortRef.current?.abort();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [params]);

//   // ==== إجراءات سريعة (نماذج سفليّة) ====
//   const [actLoading, setActLoading] = useState(false);

//   // تغيير الحالة
//   const [statusDistId, setStatusDistId] = useState<string>("");
//   const [statusNew, setStatusNew] =
//     useState<"Open" | "InProgress" | "Closed" | "Escalated">("InProgress");
//   const [statusNote, setStatusNote] = useState("");

//   // تعيين مكلّف — (قائمة مستقلة عن فلاتر أعلى الجدول)
//   const [assignDistId, setAssignDistId] = useState<string>("");
//   const [assignDept, setAssignDept] = useState<string>("");
//   const [assignUsers, setAssignUsers] = useState<UserLite[]>([]);
//   const [assignUsersLoading, setAssignUsersLoading] = useState(false);
//   const [assignUser, setAssignUser] = useState<string>("");
//   const [assignNote, setAssignNote] = useState("");

//   useEffect(() => {
//     (async () => {
//       setAssignUsers([]);
//       setAssignUser("");
//       if (!assignDept) return;
//       setAssignUsersLoading(true);
//       try {
//         const res = await api.get<UserLite[]>(
//           `/users/by-department/${assignDept}`
//         );
//         setAssignUsers(Array.isArray(res.data) ? res.data : []);
//       } catch {
//         // تجاهل
//       } finally {
//         setAssignUsersLoading(false);
//       }
//     })();
//   }, [assignDept]);

//   // إحالة وارد — (قائمة مستخدمين مستقلّة عن فلاتر أعلى الجدول)
//   const [fwdIncomingId, setFwdIncomingId] = useState<string>("");
//   const [fwdDept, setFwdDept] = useState<string>("");
//   const [fwdUsers, setFwdUsers] = useState<UserLite[]>([]);
//   const [fwdUsersLoading, setFwdUsersLoading] = useState(false);
//   const [fwdUser, setFwdUser] = useState<string>("");
//   const [fwdClosePrev, setFwdClosePrev] = useState(true);
//   const [fwdNote, setFwdNote] = useState("");

//   useEffect(() => {
//     (async () => {
//       setFwdUsers([]);
//       setFwdUser("");
//       if (!fwdDept) return;
//       setFwdUsersLoading(true);
//       try {
//         const res = await api.get<UserLite[]>(`/users/by-department/${fwdDept}`);
//         setFwdUsers(Array.isArray(res.data) ? res.data : []);
//       } catch {
//         // تجاهل
//       } finally {
//         setFwdUsersLoading(false);
//       }
//     })();
//   }, [fwdDept]);

//   async function applyStatus(e: React.FormEvent) {
//     e.preventDefault();
//     if (!statusDistId) return alert("أدخل رقم توزيع صحيح");
//     setActLoading(true);
//     try {
//       await api.patch(`/incoming/distributions/${statusDistId}/status`, {
//         status: statusNew,
//         note: statusNote || null,
//       });
//       setStatusNote("");
//       await load();
//       alert("تم تحديث الحالة");
//     } catch (e: any) {
//       alert(e?.response?.data?.message ?? "فشل تغيير الحالة");
//     } finally {
//       setActLoading(false);
//     }
//   }

//   async function applyAssign(e: React.FormEvent) {
//     e.preventDefault();
//     if (!assignDistId) return alert("أدخل رقم توزيع صحيح");
//     if (!assignDept) return alert("اختر الإدارة أولًا");
//     if (!assignUser) return alert("اختر المكلّف");
//     setActLoading(true);
//     try {
//       await api.patch(`/incoming/distributions/${assignDistId}/assign`, {
//         assignedToUserId: Number(assignUser),
//         note: assignNote || null,
//       });
//       setAssignNote("");
//       await load();
//       alert("تم التعيين");
//     } catch (e: any) {
//       alert(e?.response?.data?.message ?? "فشل التعيين");
//     } finally {
//       setActLoading(false);
//     }
//   }

//   async function applyForward(e: React.FormEvent) {
//     e.preventDefault();
//     if (!fwdIncomingId) return alert("أدخل رقم الوارد");
//     if (!fwdDept) return alert("اختر القسم المستهدف");
//     setActLoading(true);
//     try {
//       await api.post(`/incoming/${fwdIncomingId}/forward`, {
//         targetDepartmentId: Number(fwdDept),
//         assignedToUserId: fwdUser ? Number(fwdUser) : undefined,
//         note: fwdNote || null,
//         closePrevious: !!fwdClosePrev,
//       });
//       setFwdNote("");
//       await load();
//       alert("تمت الإحالة");
//     } catch (e: any) {
//       alert(e?.response?.data?.message ?? "فشل الإحالة");
//     } finally {
//       setActLoading(false);
//     }
//   }

//   function resetFilters() {
//     setQInput("");
//     setQ("");
//     setFrom("");
//     setTo("");
//     setDeptId("");
//     setAssigneeId("");
//     setIncomingNumber("");
//     setDistributionId("");
//     setBucket("all");
//     setPage(1);
//   }

//   const total = data?.total ?? 0;
//   const currentPage = data?.page ?? 1;
//   const totalPages = data?.pages ?? 1;

//   return (
//     <div className="space-y-6" dir="rtl">
//       <header className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">مكتبي</h1>
//           <p className="text-sm text-gray-500 mt-1">
//             كل التوزيعات المفتوحة/تحت الإجراء المرتبطة بك أو بإدارتك/قسمك، مع
//             إبراز المتأخر منها بناءً على تاريخ الاستحقاق (SLA).
//           </p>
//         </div>
//       </header>

//       {/* فلاتر أعلى الجدول */}
//       <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-3">
//         <div className="grid lg:grid-cols-8 sm:grid-cols-3 grid-cols-1 gap-3 text-sm">
//           <div className="lg:col-span-2">
//             <label className="text-xs text-gray-500">بحث (رقم/عنوان/جهة)</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={qInput}
//               onChange={(e) => setQInput(e.target.value)}
//               placeholder="..."
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">من تاريخ</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               type="date"
//               value={from}
//               onChange={(e) => {
//                 setPage(1);
//                 setFrom(e.target.value);
//               }}
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">إلى تاريخ</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               type="date"
//               value={to}
//               onChange={(e) => {
//                 setPage(1);
//                 setTo(e.target.value);
//               }}
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">الإدارة/القسم</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={deptId}
//               onChange={(e) => {
//                 setPage(1);
//                 setDeptId(e.target.value);
//               }}
//             >
//               <option value="">الكل</option>
//               {departments.map((d) => (
//                 <option key={d.id} value={d.id}>
//                   {d.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">المكلّف</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={assigneeId}
//               onChange={(e) => {
//                 setPage(1);
//                 setAssigneeId(e.target.value);
//               }}
//               disabled={!deptId || loadingUsersFilter}
//             >
//               <option value="">
//                 {loadingUsersFilter ? "جاري التحميل..." : "الكل"}
//               </option>
//               {usersFilter.map((u) => (
//                 <option key={u.id} value={u.id}>
//                   {u.fullName}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">رقم الوارد</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={incomingNumber}
//               onChange={(e) => {
//                 setPage(1);
//                 setIncomingNumber(e.target.value);
//               }}
//               placeholder="مثال: 2025/000123"
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">رقم التوزيع</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={distributionId}
//               onChange={(e) => {
//                 setPage(1);
//                 setDistributionId(e.target.value);
//               }}
//               placeholder="ID"
//             />
//           </div>

//           <div className="flex flex-col sm:flex-row sm:items-end gap-2">
//             <button
//               onClick={() => load()}
//               className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 min-w-[110px] whitespace-nowrap shrink-0"
//             >
//               تحديث
//             </button>
//             <button
//               onClick={resetFilters}
//               className="w-full sm:w-auto border rounded-xl px-4 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 min-w-[110px] whitespace-nowrap shrink-0"
//             >
//               إعادة تعيين
//             </button>
//           </div>
//         </div>

//         {/* أزرار منظور SLA السريع */}
//         <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
//           <span className="text-gray-500">عرض سريع حسب تاريخ الاستحقاق:</span>
//           {(
//             [
//               ["all", "الكل"],
//               ["overdue", "متأخرة"],
//               ["today", "مستحقة اليوم"],
//               ["week", "هذا الأسبوع"],
//               ["escalated", "تم تصعيدها"],
//             ] as [Bucket, string][]
//           ).map(([b, label]) => (
//             <button
//               key={b}
//               onClick={() => {
//                 setPage(1);
//                 setBucket(b);
//               }}
//               className={[
//                 "px-3 py-1 rounded-full border text-xs",
//                 bucket === b
//                   ? "bg-blue-600 text-white border-blue-600"
//                   : "bg-white text-gray-700 hover:bg-gray-50",
//               ].join(" ")}
//             >
//               {label}
//             </button>
//           ))}
//         </div>
//         <div className="text-[11px] text-gray-500 mt-1">
//           يتم الاعتماد على حقل <span className="font-mono">dueAt</span> من
//           التوزيع (SLA). التوزيعات المغلقة لا تُعتبر متأخرة حتى لو كان تاريخ
//           الاستحقاق قد مضى.
//         </div>
//       </section>

//       {slaSummary && (
//         <section className="bg-white border rounded-2xl shadow-sm p-4 mb-4" dir="rtl">
//           <div className="flex items-center justify-between mb-3">
//             <h3 className="text-sm font-semibold">ملخّص SLA لمكتبي</h3>
//             {loadingSlaSummary && (
//               <span className="text-xs text-gray-500">جارِ التحديث...</span>
//             )}
//           </div>

//           <div className="grid sm:grid-cols-5 gap-3 text-sm">
//             <div className="rounded-xl border p-3 bg-gray-50">
//               <div className="text-xs text-gray-500 mb-1">إجمالي المعاملات</div>
//               <div className="text-lg font-bold">{slaSummary.total}</div>
//             </div>

//             <div className="rounded-xl border p-3 bg-emerald-50">
//               <div className="text-xs text-gray-500 mb-1">ضمن الوقت</div>
//               <div className="text-lg font-bold">{slaSummary.onTrack}</div>
//             </div>

//             <div className="rounded-xl border p-3 bg-amber-50">
//               <div className="text-xs text-gray-500 mb-1">قريبة من الانتهاء</div>
//               <div className="text-lg font-bold">{slaSummary.dueSoon}</div>
//             </div>

//             <div className="rounded-xl border p-3 bg-red-50">
//               <div className="text-xs text-gray-500 mb-1">متأخرة</div>
//               <div className="text-lg font-bold">{slaSummary.overdue}</div>
//             </div>

//             <div className="rounded-xl border p-3 bg-rose-50">
//               <div className="text-xs text-gray-500 mb-1">تم التصعيد</div>
//               <div className="text-lg font-bold">{slaSummary.escalated}</div>
//             </div>
//           </div>

//           <div className="text-[11px] text-gray-500 mt-2">
//             * يُحتسب الملخّص فقط للمعاملات بحالة Open / InProgress / Escalated.
//           </div>
//         </section>
//       )}

//       {/* جدول */}
//       <section className="bg-white border rounded-2xl shadow-sm p-4">
//         {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
//         {loading ? (
//           <div className="text-sm text-gray-500">...جاري التحميل</div>
//         ) : (
//           <>
//             <div className="overflow-auto rounded-xl border">
//               <table className="min-w-full text-sm">
//                 <thead>
//                   <tr className="bg-gray-100">
//                     <th className="p-2 text-right"># توزيع</th>
//                     <th className="p-2 text-right">رقم الوارد</th>
//                     <th className="p-2 text-right">عنوان الوثيقة</th>
//                     <th className="p-2 text-right">الجهة</th>
//                     <th className="p-2 text-right">تاريخ الاستلام</th>
//                     <th className="p-2 text-right">تاريخ الاستحقاق</th>
//                     <th className="p-2 text-right">الأولوية</th>
//                     <th className="p-2 text-right">التصعيدات</th>
//                     <th className="p-2 text-right">الحالة</th>
//                     <th className="p-2 text-right">آخر تحديث</th>
//                     <th className="p-2 text-right">إجراءات</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {data?.rows?.length ? (
//                     data.rows.map((r) => {
//                       const priority =
//                         typeof r.priority === "number" &&
//                         Number.isFinite(r.priority)
//                           ? r.priority
//                           : 0;
//                       const escCount =
//                         typeof r.escalationCount === "number" &&
//                         Number.isFinite(r.escalationCount)
//                           ? r.escalationCount
//                           : 0;
//                       const overdue = isOverdue(r);

//                       return (
//                         <tr
//                           key={r.distributionId}
//                           className={
//                             "border-t " + (overdue ? "bg-rose-50" : "")
//                           }
//                         >
//                           <td className="p-2">{r.distributionId}</td>
//                           <td className="p-2">
//                             {r.incomingId ? (
//                               <Link
//                                 className="text-blue-600 hover:underline font-mono"
//                                 to={`/incoming/${r.incomingId}`}
//                               >
//                                 {r.incomingNumber ?? r.incomingId}
//                               </Link>
//                             ) : (
//                               "—"
//                             )}
//                           </td>
//                           <td className="p-2">{r.document?.title ?? "—"}</td>
//                           <td className="p-2">
//                             {r.externalPartyName ?? "—"}
//                           </td>
//                           <td className="p-2">{fmtDT(r.receivedDate)}</td>
//                           <td className="p-2">{fmtDT(r.dueAt)}</td>
//                           <td className="p-2">{priority}</td>
//                           <td className="p-2">{escCount}</td>
//                           <td className="p-2">
//                             <span
//                               className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${badgeCls(
//                                 r.status
//                               )}`}
//                             >
//                               {r.status}
//                               {overdue && (
//                                 <span className="ml-1 text-[10px] text-rose-700">
//                                   (متأخرة)
//                                 </span>
//                               )}
//                             </span>
//                           </td>
//                           <td className="p-2">{fmtDT(r.lastUpdateAt)}</td>
//                           <td className="p-2">
//                             <div className="flex flex-wrap items-center gap-2">
//                               <button
//                                 onClick={() => {
//                                   setStatusDistId(r.distributionId);
//                                   setStatusNew("InProgress");
//                                   setStatusNote("");
//                                 }}
//                                 className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
//                               >
//                                 حالة
//                               </button>
//                               <button
//                                 onClick={() => {
//                                   setAssignDistId(r.distributionId);
//                                   setAssignDept("");
//                                   setAssignUser("");
//                                   setAssignNote("");
//                                 }}
//                                 className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
//                               >
//                                 تعيين
//                               </button>
//                               <button
//                                 onClick={() => {
//                                   setFwdIncomingId(r.incomingId);
//                                   setFwdDept("");
//                                   setFwdUser("");
//                                   setFwdClosePrev(true);
//                                   setFwdNote("");
//                                 }}
//                                 className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
//                               >
//                                 إحالة
//                               </button>
//                               <Link
//                                 to={`/incoming/${r.incomingId}`}
//                                 className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
//                               >
//                                 عرض
//                               </Link>
//                             </div>
//                           </td>
//                         </tr>
//                       );
//                     })
//                   ) : (
//                     <tr>
//                       <td colSpan={11} className="p-4 text-center text-gray-500">
//                         لا توجد عناصر
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>

//             {/* صفحات */}
//             <div className="flex items-center justify-between mt-3 text-sm">
//               <div>الإجمالي: {total}</div>
//               <div className="flex items-center gap-2">
//                 <button
//                   disabled={currentPage <= 1}
//                   onClick={() => setPage((p) => Math.max(1, p - 1))}
//                   className="rounded-lg border px-3 py-1 disabled:opacity-50"
//                 >
//                   السابق
//                 </button>
//                 <span>
//                   صفحة {currentPage} / {totalPages}
//                 </span>
//                 <button
//                   disabled={currentPage >= totalPages}
//                   onClick={() =>
//                     setPage((p) =>
//                       totalPages ? Math.min(totalPages, p + 1) : p + 1
//                     )
//                   }
//                   className="rounded-lg border px-3 py-1 disabled:opacity-50"
//                 >
//                   التالي
//                 </button>
//               </div>
//             </div>
//           </>
//         )}
//       </section>

//       {/* نماذج صغيرة سريعة */}
//       <section className="grid md:grid-cols-3 gap-4">
//         {/* تغيير الحالة */}
//         <form
//           onSubmit={applyStatus}
//           className="bg-white border rounded-2xl shadow-sm p-4 space-y-2"
//         >
//           <div className="font-semibold">تغيير حالة توزيع</div>
//           <div>
//             <label className="text-xs text-gray-500"># توزيع</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={statusDistId}
//               onChange={(e) => setStatusDistId(e.target.value)}
//               placeholder="رقم التوزيع"
//             />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">الحالة الجديدة</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={statusNew}
//               onChange={(e) => setStatusNew(e.target.value as any)}
//             >
//               <option value="Open">Open</option>
//               <option value="InProgress">InProgress</option>
//               <option value="Closed">Closed</option>
//               <option value="Escalated">Escalated</option>
//             </select>
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">ملاحظة</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={statusNote}
//               onChange={(e) => setStatusNote(e.target.value)}
//               placeholder="اختياري"
//             />
//           </div>
//           <div>
//             <button
//               disabled={actLoading}
//               className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
//             >
//               {actLoading ? "..." : "تطبيق الحالة"}
//             </button>
//           </div>
//         </form>

//         {/* تعيين مكلّف */}
//         <form
//           onSubmit={applyAssign}
//           className="bg-white border rounded-2xl shadow-sm p-4 space-y-2"
//         >
//           <div className="font-semibold">تعيين مكلّف</div>

//           <div>
//             <label className="text-xs text-gray-500"># توزيع</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={assignDistId}
//               onChange={(e) => setAssignDistId(e.target.value)}
//               placeholder="رقم التوزيع"
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">الإدارة</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={assignDept}
//               onChange={(e) => setAssignDept(e.target.value)}
//             >
//               <option value="">اختر قسمًا</option>
//               {departments.map((d) => (
//                 <option key={d.id} value={d.id}>
//                   {d.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">المكلّف</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={assignUser}
//               onChange={(e) => setAssignUser(e.target.value)}
//               disabled={!assignDept || assignUsersLoading}
//             >
//               <option value="">
//                 {assignUsersLoading ? "جاري التحميل..." : "اختر مستخدمًا"}
//               </option>
//               {assignUsers.map((u) => (
//                 <option key={u.id} value={u.id}>
//                   {u.fullName}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">ملاحظة</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={assignNote}
//               onChange={(e) => setAssignNote(e.target.value)}
//               placeholder="اختياري"
//             />
//           </div>

//           <div>
//             <button
//               disabled={actLoading}
//               className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
//             >
//               {actLoading ? "..." : "تطبيق التعيين"}
//             </button>
//           </div>
//         </form>

//         {/* إحالة وارد */}
//         <form
//           onSubmit={applyForward}
//           className="bg-white border rounded-2xl shadow-sm p-4 space-y-2"
//         >
//           <div className="font-semibold">إحالة وارد</div>

//           <div>
//             <label className="text-xs text-gray-500"># الوارد</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={fwdIncomingId}
//               onChange={(e) => setFwdIncomingId(e.target.value)}
//               placeholder="رقم الوارد"
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">القسم المستهدف</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={fwdDept}
//               onChange={(e) => setFwdDept(e.target.value)}
//             >
//               <option value="">اختر قسمًا</option>
//               {departments.map((d) => (
//                 <option key={d.id} value={d.id}>
//                   {d.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">المكلّف (اختياري)</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={fwdUser}
//               onChange={(e) => setFwdUser(e.target.value)}
//               disabled={!fwdDept || fwdUsersLoading}
//             >
//               <option value="">
//                 {fwdUsersLoading ? "جاري التحميل..." : "—"}
//               </option>
//               {fwdUsers.map((u) => (
//                 <option key={u.id} value={u.id}>
//                   {u.fullName}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="flex items-center gap-2">
//             <input
//               id="closePrev"
//               type="checkbox"
//               checked={fwdClosePrev}
//               onChange={(e) => setFwdClosePrev(e.target.checked)}
//             />
//             <label htmlFor="closePrev" className="text-sm">
//               إغلاق التوزيع السابق تلقائيًا
//             </label>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">ملاحظة</label>
//             <input
//               className="w-full border rounded-xl p-2"
//               value={fwdNote}
//               onChange={(e) => setFwdNote(e.target.value)}
//               placeholder="اختياري"
//             />
//           </div>

//           <div>
//             <button
//               disabled={actLoading}
//               className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
//             >
//               {actLoading ? "..." : "تنفيذ الإحالة"}
//             </button>
//           </div>
//         </form>
//       </section>
//     </div>
//   );
// }

