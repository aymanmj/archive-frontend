import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/apiClient";

type Dept = { id: number; name: string; status?: string };
type UserLite = { id: number; fullName: string; departmentId: number|null };

type Row = {
  id: string;                 // distributionId
  distributionId: string;
  status: "Open" | "InProgress" | "Closed" | "Escalated";
  lastUpdateAt?: string;
  incomingId: string;
  incomingNumber?: string;
  receivedDate?: string;
  externalPartyName?: string;
  document?: { id: string | number; title: string } | null;
};

type Resp = {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  rows: Row[];
};

function fmtDT(v?: string) {
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

export default function MyDeskPage() {
  // فلاتر نص/تاريخ
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); // YYYY-MM-DD
  const [to, setTo] = useState("");     // YYYY-MM-DD
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // فلاتر جديدة (أعلى الجدول)
  const [deptId, setDeptId] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [incomingNumber, setIncomingNumber] = useState("");
  const [distributionId, setDistributionId] = useState("");

  // مصادر القوائم (للفلاتر + النماذج)
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [usersFilter, setUsersFilter] = useState<UserLite[]>([]);
  const [loadingUsersFilter, setLoadingUsersFilter] = useState(false);

  // بيانات الجدول
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // تحميل الإدارات مرة واحدة
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<Dept[]>('/departments', { params: { status: 'Active' }});
        setDepartments(Array.isArray(res.data) ? res.data : []);
      } catch {}
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
      } catch {}
      finally { setLoadingUsersFilter(false); }
    })();
  }, [deptId]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    if (q.trim()) p.set("q", q.trim());
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (deptId) p.set("deptId", deptId);
    if (assigneeId) p.set("assigneeId", assigneeId);
    if (incomingNumber.trim()) p.set("incomingNumber", incomingNumber.trim());
    if (distributionId.trim()) p.set("distributionId", distributionId.trim());
    return p.toString();
  }, [page, pageSize, q, from, to, deptId, assigneeId, incomingNumber, distributionId]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await api.get<Resp>(`/incoming/my-desk?${params}`);
      setData(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params]);

  // ==== إجراءات سريعة (نماذج سفليّة) ====

  const [actLoading, setActLoading] = useState(false);

  // تغيير الحالة
  const [statusDistId, setStatusDistId] = useState<string>("");
  const [statusNew, setStatusNew] = useState<"Open"|"InProgress"|"Closed"|"Escalated">("InProgress");
  const [statusNote, setStatusNote] = useState("");

  // تعيين مكلّف — (قائمة مستقلة عن فلاتر أعلى الجدول)
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
        const res = await api.get<UserLite[]>(`/users/by-department/${assignDept}`);
        setAssignUsers(Array.isArray(res.data) ? res.data : []);
      } catch {}
      finally { setAssignUsersLoading(false); }
    })();
  }, [assignDept]);

  // إحالة وارد — (قائمة مستخدمين مستقلّة عن فلاتر أعلى الجدول)
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
      } catch {}
      finally { setFwdUsersLoading(false); }
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

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">طاولتي</h1>
          <p className="text-sm text-gray-500 mt-1">كل التوزيعات المفتوحة/تحت الإجراء المرتبطة بك أو بقسمك</p>
        </div>
      </header>

      {/* فلاتر أعلى الجدول */}
      <section className="bg-white border rounded-2xl shadow-sm p-4">
        <div className="grid lg:grid-cols-7 sm:grid-cols-3 grid-cols-1 gap-3 text-sm">
          <div className="lg:col-span-2">
            <label className="text-xs text-gray-500">بحث (رقم/عنوان/جهة)</label>
            <input className="w-full border rounded-xl p-2"
              value={q}
              onChange={(e)=>{ setPage(1); setQ(e.target.value); }}
              placeholder="..." />
          </div>

          <div>
            <label className="text-xs text-gray-500">من تاريخ</label>
            <input className="w-full border rounded-xl p-2" type="date"
              value={from}
              onChange={(e)=>{ setPage(1); setFrom(e.target.value); }} />
          </div>

          <div>
            <label className="text-xs text-gray-500">إلى تاريخ</label>
            <input className="w-full border rounded-xl p-2" type="date"
              value={to}
              onChange={(e)=>{ setPage(1); setTo(e.target.value); }} />
          </div>

          <div>
            <label className="text-xs text-gray-500">الإدارة/القسم</label>
            <select
              className="w-full border rounded-xl p-2 bg-white"
              value={deptId}
              onChange={(e)=>{ setPage(1); setDeptId(e.target.value); }}>
              <option value="">الكل</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">المكلّف</label>
            <select
              className="w-full border rounded-xl p-2 bg-white"
              value={assigneeId}
              onChange={(e)=>{ setPage(1); setAssigneeId(e.target.value); }}
              disabled={!deptId || loadingUsersFilter}>
              <option value="">{loadingUsersFilter ? "جاري التحميل..." : "الكل"}</option>
              {usersFilter.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">رقم الوارد</label>
            <input className="w-full border rounded-xl p-2"
              value={incomingNumber}
              onChange={(e)=>{ setPage(1); setIncomingNumber(e.target.value); }}
              placeholder="مثال: 2025/000123" />
          </div>

          <div>
            <label className="text-xs text-gray-500">رقم التوزيع</label>
            <input className="w-full border rounded-xl p-2"
              value={distributionId}
              onChange={(e)=>{ setPage(1); setDistributionId(e.target.value); }}
              placeholder="ID" />
          </div>

          <div className="flex items-end">
            <button onClick={()=>load()} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2">
              تحديث
            </button>
          </div>
        </div>
      </section>

      {/* جدول */}
      <section className="bg-white border rounded-2xl shadow-sm p-4">
        {err && <div className="text-sm text-red-600">{err}</div>}
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
                    <th className="p-2 text-right">الحالة</th>
                    <th className="p-2 text-right">آخر تحديث</th>
                    <th className="p-2 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows?.length ? data.rows.map(r => (
                    <tr key={r.distributionId} className="border-t">
                      <td className="p-2">{r.distributionId}</td>
                      <td className="p-2">
                        {r.incomingId ? (
                          <Link className="text-blue-600 hover:underline font-mono"
                                to={`/incoming/${r.incomingId}`}>{r.incomingNumber ?? r.incomingId}</Link>
                        ) : "—"}
                      </td>
                      <td className="p-2">{r.document?.title ?? "—"}</td>
                      <td className="p-2">{r.externalPartyName ?? "—"}</td>
                      <td className="p-2">{fmtDT(r.receivedDate)}</td>
                      <td className="p-2">
                        <span className={[
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs",
                          r.status==="Open" ? "bg-blue-100 text-blue-700" :
                          r.status==="InProgress" ? "bg-amber-100 text-amber-700" :
                          r.status==="Closed" ? "bg-emerald-100 text-emerald-700" :
                          "bg-rose-100 text-rose-700"
                        ].join(" ")}>{r.status}</span>
                      </td>
                      <td className="p-2">{fmtDT(r.lastUpdateAt)}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => { setStatusDistId(r.distributionId); setStatusNew("InProgress"); setStatusNote(""); }}
                            className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50">حالة</button>
                          <button
                            onClick={() => { setAssignDistId(r.distributionId); setAssignDept(""); setAssignUser(""); setAssignNote(""); }}
                            className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50">تعيين</button>
                          <button
                            onClick={() => { setFwdIncomingId(r.incomingId); setFwdDept(""); setFwdUser(""); setFwdClosePrev(true); setFwdNote(""); }}
                            className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50">إحالة</button>
                          <Link to={`/incoming/${r.incomingId}`} className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50">عرض</Link>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} className="p-4 text-center text-gray-500">لا توجد عناصر</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* صفحات */}
            <div className="flex items-center justify-between mt-3 text-sm">
              <div>الإجمالي: {data?.total ?? 0}</div>
              <div className="flex items-center gap-2">
                <button
                  disabled={(data?.page ?? 1) <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="rounded-lg border px-3 py-1 disabled:opacity-50">السابق</button>
                <span>صفحة {data?.page ?? 1} / {data?.pages ?? 1}</span>
                <button
                  disabled={(data?.page ?? 1) >= (data?.pages ?? 1)}
                  onClick={() => setPage(p => (data?.pages ? Math.min(data.pages, p + 1) : p + 1))}
                  className="rounded-lg border px-3 py-1 disabled:opacity-50">التالي</button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* نماذج صغيرة سريعة */}
      <section className="grid md:grid-cols-3 gap-4">
        {/* تغيير الحالة */}
        <form onSubmit={applyStatus} className="bg-white border rounded-2xl shadow-sm p-4 space-y-2">
          <div className="font-semibold">تغيير حالة توزيع</div>
          <div>
            <label className="text-xs text-gray-500"># توزيع</label>
            <input className="w-full border rounded-xl p-2" value={statusDistId} onChange={e=>setStatusDistId(e.target.value)} placeholder="رقم التوزيع" />
          </div>
          <div>
            <label className="text-xs text-gray-500">الحالة الجديدة</label>
            <select className="w-full border rounded-xl p-2 bg-white" value={statusNew} onChange={e=>setStatusNew(e.target.value as any)}>
              <option value="Open">Open</option>
              <option value="InProgress">InProgress</option>
              <option value="Closed">Closed</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">ملاحظة</label>
            <input className="w-full border rounded-xl p-2" value={statusNote} onChange={e=>setStatusNote(e.target.value)} placeholder="اختياري" />
          </div>
          <div>
            <button disabled={actLoading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2">
              {actLoading ? "..." : "تطبيق الحالة"}
            </button>
          </div>
        </form>

        {/* تعيين مكلّف */}
        <form onSubmit={applyAssign} className="bg-white border rounded-2xl shadow-sm p-4 space-y-2">
          <div className="font-semibold">تعيين مكلّف</div>

          <div>
            <label className="text-xs text-gray-500"># توزيع</label>
            <input className="w-full border rounded-xl p-2" value={assignDistId} onChange={e=>setAssignDistId(e.target.value)} placeholder="رقم التوزيع" />
          </div>

          <div>
            <label className="text-xs text-gray-500">الإدارة</label>
            <select className="w-full border rounded-xl p-2 bg-white"
              value={assignDept}
              onChange={(e)=>setAssignDept(e.target.value)}>
              <option value="">اختر قسمًا</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">المكلّف</label>
            <select className="w-full border rounded-xl p-2 bg-white"
              value={assignUser}
              onChange={(e)=>setAssignUser(e.target.value)}
              disabled={!assignDept || assignUsersLoading}>
              <option value="">{assignUsersLoading ? "جاري التحميل..." : "اختر مستخدمًا"}</option>
              {assignUsers.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">ملاحظة</label>
            <input className="w-full border rounded-xl p-2" value={assignNote} onChange={e=>setAssignNote(e.target.value)} placeholder="اختياري" />
          </div>

          <div>
            <button disabled={actLoading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2">
              {actLoading ? "..." : "تطبيق التعيين"}
            </button>
          </div>
        </form>

        {/* إحالة وارد */}
        <form onSubmit={applyForward} className="bg-white border rounded-2xl shadow-sm p-4 space-y-2">
          <div className="font-semibold">إحالة وارد</div>

          <div>
            <label className="text-xs text-gray-500"># الوارد</label>
            <input className="w-full border rounded-xl p-2" value={fwdIncomingId} onChange={e=>setFwdIncomingId(e.target.value)} placeholder="رقم الوارد" />
          </div>

          <div>
            <label className="text-xs text-gray-500">القسم المستهدف</label>
            <select className="w-full border rounded-xl p-2 bg-white"
              value={fwdDept}
              onChange={(e)=>setFwdDept(e.target.value)}>
              <option value="">اختر قسمًا</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">المكلّف (اختياري)</label>
            <select className="w-full border rounded-xl p-2 bg-white"
              value={fwdUser}
              onChange={(e)=>setFwdUser(e.target.value)}
              disabled={!fwdDept || fwdUsersLoading}>
              <option value="">{fwdUsersLoading ? "جاري التحميل..." : "—"}</option>
              {fwdUsers.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input id="closePrev" type="checkbox" checked={fwdClosePrev} onChange={e=>setFwdClosePrev(e.target.checked)} />
            <label htmlFor="closePrev" className="text-sm">إغلاق التوزيع السابق تلقائيًا</label>
          </div>

          <div>
            <label className="text-xs text-gray-500">ملاحظة</label>
            <input className="w-full border rounded-xl p-2" value={fwdNote} onChange={e=>setFwdNote(e.target.value)} placeholder="اختياري" />
          </div>

          <div>
            <button disabled={actLoading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2">
              {actLoading ? "..." : "تنفيذ الإحالة"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}



