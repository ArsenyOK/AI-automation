import { useEffect, useRef, useState } from "react";
import SettingsIcon from "../icons/SettingsIcon";
import type { Settings } from "../../hooks/useSettings";

type SettingsBlockProps = {
  onOpenHistory: () => void;
  onResetSession: () => void;

  settings: Settings;
  setTheme: (theme: Settings["theme"]) => void;
};

const SettingsBlock = ({
  onOpenHistory,
  onResetSession,
  settings,
  setTheme,
}: SettingsBlockProps) => {
  const [menuOpen, setMenuOpen] = useState(false); // three dots menu
  const [settingsOpen, setSettingsOpen] = useState(false); // settings popover

  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setMenuOpen(false);
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSettingsOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ThemeRow = ({
    value,
    label,
  }: {
    value: Settings["theme"];
    label: string;
  }) => {
    const active = settings.theme === value;
    return (
      <button
        type="button"
        onClick={() => setTheme(value)}
        className={[
          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition cursor-pointer",
          active
            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200"
            : "hover:bg-slate-50 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60",
        ].join(" ")}
      >
        <span className="font-medium">{label}</span>
        <span
          className={[
            "h-4 w-4 rounded-full border flex items-center justify-center",
            active
              ? "border-indigo-500 bg-indigo-600"
              : "border-slate-300 dark:border-slate-600",
          ].join(" ")}
        >
          {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
        </span>
      </button>
    );
  };

  return (
    <div
      ref={rootRef}
      className="
    relative inline-flex items-center gap-2 rounded-xl
    bg-white px-2 py-1.5 text-slate-600 shadow-sm ring-1 ring-slate-200/60
    dark:bg-slate-900 dark:text-slate-300 dark:shadow-none dark:ring-slate-800
  "
    >
      {/* History */}
      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          setSettingsOpen(false);
          onOpenHistory();
        }}
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition cursor-pointer
                   dark:hover:bg-slate-800/60"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <span className="text-sm font-medium">History</span>
      </button>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Settings popover */}
      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          setSettingsOpen((v) => !v);
        }}
        className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-50 transition cursor-pointer
                   dark:hover:bg-slate-800/60"
        aria-label="Settings"
      >
        <SettingsIcon />
      </button>

      {settingsOpen && (
        <div
          className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg
                        dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Appearance
          </div>

          <div className="px-2 pb-2">
            <ThemeRow value="system" label="System" />
            <ThemeRow value="light" label="Light" />
            <ThemeRow value="dark" label="Dark" />
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tip
          </div>
          <div className="px-3 pb-3 text-xs text-slate-500 dark:text-slate-400">
            Theme is saved automatically.
          </div>
        </div>
      )}

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Three dots menu */}
      <button
        type="button"
        onClick={() => {
          setSettingsOpen(false);
          setMenuOpen((v) => !v);
        }}
        className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-50 transition cursor-pointer
                   dark:hover:bg-slate-800/60"
        aria-label="More"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
          />
        </svg>
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg
                        dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Session
          </div>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onResetSession();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 cursor-pointer
                       dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            <span className="font-medium">Reset session</span>
          </button>
        </div>
      )}
    </div>
  );
};
export default SettingsBlock;
