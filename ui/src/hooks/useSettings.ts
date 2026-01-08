import { useEffect, useState } from "react";

export type Settings = {
  theme: "light" | "dark" | "system";
  language: "en" | "ua" | "ru";
};

const STORAGE_KEY = "app_settings_v1";

const defaultSettings: Settings = {
  theme: "system",
  language: "en",
};

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Settings["theme"]) {
  const root = document.documentElement;

  const resolved = theme === "system" ? getSystemTheme() : theme;

  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    applyTheme(settings.theme);

    if (settings.theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");

    // safari compatibility
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [settings.theme]);

  const setTheme = (theme: Settings["theme"]) =>
    setSettings((prev) => ({ ...prev, theme }));

  return { settings, setSettings, setTheme };
}
