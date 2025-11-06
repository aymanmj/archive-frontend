// src/components/ThemeToggle.tsx

import { useThemeStore } from "../stores/themeStore";
import { Moon, Sun, Monitor } from "lucide-react";

export default function ThemeToggle() {
  const { mode, resolved, setMode, toggle } = useThemeStore();

  const nextLabel = mode === "light" ? "الداكن" : mode === "dark" ? "النظام" : "الفاتح";
  const Icon = resolved === "dark" ? Moon : resolved === "light" ? Sun : Monitor;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggle}
        className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10 dark:border-white/20 flex items-center gap-2"
        title={`تبديل الثيم (التالي: ${nextLabel})`}
      >
        <Icon className="size-4" />
        <span className="hidden sm:inline">
          {mode === "light" ? "فاتح" : mode === "dark" ? "داكن" : "النظام"}
        </span>
      </button>

      {/* قائمة سريعة لاختيار وضع معيّن (اختياري) */}
      <div className="hidden md:flex rounded-xl overflow-hidden border dark:border-white/20">
        {(["light", "dark", "system"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={[
              "px-2 py-1 text-xs border-l last:border-l-0",
              "hover:bg-gray-50 dark:hover:bg-white/10",
              m === mode ? "bg-gray-100 dark:bg-white/10 font-semibold" : "bg-white dark:bg-transparent",
              "border-gray-200 dark:border-white/10",
            ].join(" ")}
          >
            {m === "light" ? "فاتح" : m === "dark" ? "داكن" : "النظام"}
          </button>
        ))}
      </div>
    </div>
  );
}
