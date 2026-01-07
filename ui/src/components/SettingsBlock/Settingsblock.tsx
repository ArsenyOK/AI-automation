import { useEffect, useRef, useState } from "react";
import SettingsIcon from "../icons/SettingsIcon";

type SettingsBlockProps = {
  onOpenHistory: () => void;
  onResetSession: () => void;
  onOpenSettings?: () => void;
};

export const SettingsBlock = ({
  onOpenHistory,
  onResetSession,
  onOpenSettings,
}: SettingsBlockProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuOpen) return;
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={menuRef}
      className="relative inline-flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 text-[#7A7E96] shadow-sm"
    >
      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          onOpenHistory();
        }}
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition cursor-pointer"
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

      <div className="h-6 w-px bg-slate-200" />

      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          onOpenSettings?.();
        }}
        className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-50 transition cursor-pointer"
        aria-label="Settings"
      >
        <SettingsIcon />
      </button>

      <div className="h-6 w-px bg-slate-200" />

      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-50 transition cursor-pointer"
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
        <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500">
            Session
          </div>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onResetSession();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>

            <div className="flex flex-col">
              <span className="font-medium">Reset session</span>
              <span className="text-xs text-slate-500">
                Clear input, plan, and results
              </span>
            </div>
          </button>

          <div className="h-px bg-slate-100" />

          <button
            type="button"
            disabled
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-300"
          >
            <span className="size-5" />
            Clear history (soon)
          </button>
        </div>
      )}
    </div>
  );
};
