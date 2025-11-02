import { useAuthStore } from "../stores/authStore";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-700">لوحة التحكم</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-white shadow p-4">
          <div className="text-slate-500 text-sm">المستخدم</div>
          <div className="text-lg">{user?.fullName ?? "—"}</div>
        </div>
        <div className="rounded-2xl bg-white shadow p-4">
          <div className="text-slate-500 text-sm">القسم</div>
          <div className="text-lg">{user?.department?.name ?? "—"}</div>
        </div>
        <div className="rounded-2xl bg-white shadow p-4">
          <div className="text-slate-500 text-sm">الأدوار</div>
          <div className="text-lg">{(user?.roles ?? []).join("، ") || "—"}</div>
        </div>
      </div>
    </div>
  );
}

