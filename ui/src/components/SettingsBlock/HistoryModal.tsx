import { useState } from "react";
import { TrashIcon } from "../icons/TrashIcon";

type HistoryItem = {
  id: string;
  title: string;
  timeLabel: string;
  intent: "create_tasks" | "summarize_text" | "generate_email" | "unknown";
  status?: "success" | "failed";
  tags?: string[];
  snippetLines: string[];
};

type HistoryModalProps = {
  open: boolean;
  onClose: () => void;
  items: HistoryItem[];
  activeId?: string | null;
  onSelectItem?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
};

const intentPillClasses = (intent: HistoryItem["intent"]) => {
  switch (intent) {
    case "create_tasks":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "summarize_text":
      return "bg-sky-50 text-sky-700 border-sky-100";
    case "generate_email":
      return "bg-indigo-50 text-indigo-700 border-indigo-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

export const HistoryModal = ({
  open,
  onClose,
  items,
  onSelectItem,
  onDeleteItem,
  activeId = null,
}: HistoryModalProps) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  if (!open) return null;

  const onCloseMenu = () => {
    onClose();
    setMenuOpenId(null);
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close"
        onClick={onCloseMenu}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      />

      <div className="absolute right-6 top-6 bottom-6 w-[520px] max-w-[calc(100vw-24px)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={onCloseMenu}
              className="rounded-lg p-2 hover:bg-slate-50 transition cursor-pointer"
              aria-label="Back"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5 text-slate-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
            </button>
            <div className="text-lg font-semibold text-slate-900">History</div>
          </div>

          <button
            onClick={onCloseMenu}
            className="rounded-lg p-2 hover:bg-slate-50 transition cursor-pointer"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5 text-slate-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 border-b border-slate-100">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
                  d="m21 21-4.3-4.3m1.8-5.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                />
              </svg>
            </div>

            <input
              placeholder="Search history..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-3 text-sm outline-none focus:border-indigo-300 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-auto h-[calc(100%-64px-72px-64px)]">
          {items.map((item, idx) => {
            const isActive = item.id === activeId;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMenuOpenId(null);
                  onSelectItem?.(item.id);
                }}
                className={[
                  "relative w-full text-left rounded-2xl border bg-white shadow-sm overflow-hidden transition",
                  "hover:shadow-md hover:border-slate-300",
                  isActive
                    ? "border-[#155DFC] ring-1 ring-indigo-200"
                    : "border-slate-200",
                ].join(" ")}
              >
                <div
                  className={[
                    "absolute left-0 top-0 h-full w-1 transition",
                    isActive ? "bg-[#155DFC]" : "bg-transparent",
                  ].join(" ")}
                />

                <div className="flex items-start justify-between gap-3 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                        isActive
                          ? "bg-[#155DFC] text-white"
                          : "bg-slate-100 text-slate-700",
                      ].join(" ")}
                    >
                      {idx + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-base font-semibold text-slate-900">
                          {item.title}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${intentPillClasses(
                            item.intent
                          )}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                          {item.intent}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {item.timeLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 cursor-pointer">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMenuOpenId((prev) =>
                            prev === item.id ? null : item.id
                          );
                        }}
                        className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer transition"
                        aria-label="Open menu"
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

                      {menuOpenId === item.id && (
                        <div
                          className="absolute right-0 top-9 z-50 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                            onClick={() => {
                              onDeleteItem?.(item.id);
                              setMenuOpenId(null);
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <div className="space-y-1 text-sm text-slate-700">
                    {item.snippetLines.slice(0, 3).map((line, i) => (
                      <div key={i} className="line-clamp-1">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700 hover:bg-white transition flex items-center justify-center gap-2"
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
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Load more
          </button>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 text-xs text-slate-500">
          Stored locally (localStorage). You can clear it in Settings.
        </div>
      </div>
    </div>
  );
};
