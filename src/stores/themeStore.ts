// src/stores/themeStore.ts

import { create } from "zustand";

type ThemeMode = "light" | "dark" | "system";

type ThemeState = {
  mode: ThemeMode;           // ما اختاره المستخدم
  resolved: "light" | "dark"; // الناتج الفعلي (بعد احتساب system)
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
};

function getSystemPref(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function computeResolved(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? getSystemPref() : mode;
}

const initialMode = ((): ThemeMode => {
  const saved = localStorage.getItem("theme-mode") as ThemeMode | null;
  return saved ?? "system";
})();

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  resolved: computeResolved(initialMode),
  setMode: (m) => {
    localStorage.setItem("theme-mode", m);
    const resolved = computeResolved(m);
    // طبق كلاس dark على <html>
    const root = document.documentElement;
    if (resolved === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    set({ mode: m, resolved });
  },
  toggle: () => {
    const cur = get().mode;
    const next: ThemeMode =
      cur === "light" ? "dark" : cur === "dark" ? "system" : "light";
    get().setMode(next);
  },
}));

// مزامنة تلقائية عندما يتغير تفضيل النظام
if (typeof window !== "undefined") {
  const mm = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    const { mode, setMode } = useThemeStore.getState();
    if (mode === "system") setMode("system");
  };
  mm.addEventListener?.("change", handler);
}
