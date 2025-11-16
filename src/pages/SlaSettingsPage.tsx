// src/pages/SlaSettingsPage.tsx

import { useEffect, useState } from "react";
import api from "../api/apiClient";
import { toast } from "sonner";

type SlaSettings = {
  id: number;
  dueSoonHours: number;
  overdueHours: number;
  escalateL1Minutes: number;
  escalateL2Minutes: number;
  escalateL3Minutes: number;
  escalateL4Minutes: number;
};

export default function SlaSettingsPage() {
  const [settings, setSettings] = useState<SlaSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<{ success: boolean; data: SlaSettings }>("/sla/settings");
        if (res.data?.success) {
          setSettings(res.data.data);
        } else {
          toast.error("تعذّر تحميل إعدادات SLA");
        }
      } catch {
        toast.error("خطأ أثناء تحميل إعدادات SLA");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateField = (field: keyof SlaSettings, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: Number(value),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const payload = {
        dueSoonHours: settings.dueSoonHours,
        overdueHours: settings.overdueHours,
        escalateL1Minutes: settings.escalateL1Minutes,
        escalateL2Minutes: settings.escalateL2Minutes,
        escalateL3Minutes: settings.escalateL3Minutes,
        escalateL4Minutes: settings.escalateL4Minutes,
      };

      const res = await api.patch("/sla/settings", payload);
      if (res.data?.success) {
        setSettings(res.data.data);
        toast.success("تم حفظ إعدادات SLA بنجاح");
      } else {
        toast.error(res.data?.error?.message ?? "تعذّر حفظ الإعدادات");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ??
          err?.response?.data?.message ??
          "خطأ أثناء حفظ الإعدادات"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" dir="rtl">
        جاري تحميل إعدادات SLA...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-red-600" dir="rtl">
        تعذّر تحميل إعدادات SLA.
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold">إعدادات SLA</h1>
        <p className="text-sm text-gray-500 mt-1">
          ضبط عتبات "قريبة من الانتهاء" و"متأخرة"، بالإضافة إلى قواعد التصعيد
          (L1–L4) حسب عدد الدقائق بعد التأخير.
        </p>
      </header>

      <form
        onSubmit={handleSave}
        className="bg-white border rounded-2xl shadow-sm p-4 space-y-4"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">
              عدد الساعات قبل اعتبار المعاملة "قريبة من الانتهاء"
            </label>
            <input
              type="number"
              min={1}
              max={168}
              className="w-full border rounded-xl p-2"
              value={settings.dueSoonHours}
              onChange={(e) => updateField("dueSoonHours", e.target.value)}
            />
            <div className="text-[11px] text-gray-500 mt-1">
              مثال: 24 ساعة = قبل يوم من الاستحقاق.
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">
              سماحية التأخير (ساعات) قبل اعتبارها "متأخرة"
            </label>
            <input
              type="number"
              min={0}
              max={168}
              className="w-full border rounded-xl p-2"
              value={settings.overdueHours}
              onChange={(e) => updateField("overdueHours", e.target.value)}
            />
            <div className="text-[11px] text-gray-500 mt-1">
              0 = تعتبر متأخرة مباشرة بعد تجاوز موعد الاستحقاق.
            </div>
          </div>
        </div>

        <div className="border-t pt-4 mt-2">
          <h2 className="text-sm font-semibold mb-3">قواعد التصعيد (Escalation)</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <label className="text-xs text-gray-500">تصعيد مستوى L1 (دقائق تأخير)</label>
              <input
                type="number"
                min={1}
                className="w-full border rounded-xl p-2"
                value={settings.escalateL1Minutes}
                onChange={(e) => updateField("escalateL1Minutes", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">تصعيد مستوى L2 (دقائق تأخير)</label>
              <input
                type="number"
                min={1}
                className="w-full border rounded-xl p-2"
                value={settings.escalateL2Minutes}
                onChange={(e) => updateField("escalateL2Minutes", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">تصعيد مستوى L3 (دقائق تأخير)</label>
              <input
                type="number"
                min={1}
                className="w-full border rounded-xl p-2"
                value={settings.escalateL3Minutes}
                onChange={(e) => updateField("escalateL3Minutes", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">تصعيد مستوى L4 (دقائق تأخير)</label>
              <input
                type="number"
                min={1}
                className="w-full border rounded-xl p-2"
                value={settings.escalateL4Minutes}
                onChange={(e) => updateField("escalateL4Minutes", e.target.value)}
              />
            </div>
          </div>

          <div className="text-[11px] text-gray-500 mt-2">
            * هذه القيم سيُعتمد عليها لاحقًا في منطق التصعيد الآلي وإرسال التنبيهات.
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2 disabled:opacity-50"
          >
            {saving ? "جارِ الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </form>
    </div>
  );
}
