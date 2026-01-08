import { useState } from "react";

interface TextareaBlockProps {
  toggleDetect: () => void;
  setRunData: (data: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setText?: (text: string) => void;
  text?: string;
  setExecuteResult?: (data: any) => void;
}

const TextareaBlock = ({
  toggleDetect,
  setRunData,
  loading,
  setLoading,
  setText,
  text,
  setExecuteResult,
}: TextareaBlockProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const fetchData = async (text: string) => {
    setLoading(true);
    setExecuteResult(null);
    const planRes = await fetch("http://localhost:3001/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text, dryRun: false }),
    });

    if (!planRes.ok) {
      const errText = await planRes.text();
      setLoading(false);
      throw new Error(`Plan error: ${planRes.status} ${errText}`);
    }

    const plan = await planRes.json();

    if (plan?.runId) {
      setRunData(plan);
      setLoading(false);
    }

    return { plan };
  };

  const onSubmit = (e: React.FormEvent) => {
    if (text) {
      e.preventDefault();
      fetchData(text);
      toggleDetect();
    }
  };

  return (
    <div className="flex justify-between gap-x-4">
      <div className="relative flex-1">
        <input
          id="prompt"
          type="text"
          name="prompt"
          required
          value={text}
          onChange={handleChange}
          placeholder="Plan my task for the next week and send the list to my eamil"
          className="w-full rounded-xl bg-[#F7F6FA] px-3.5 font-medium text-md py-3 border-2 border-gray-200 outline-1 -outline-offset-1 outline-white/5 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 shadow-sm"
        />
        {text?.trim()?.length > 0 && (
          <button
            type="button"
            onClick={() => setText("")}
            className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear input"
          >
            ✕
          </button>
        )}
      </div>
      <button
        onClick={onSubmit}
        disabled={loading}
        className={`
    flex items-center justify-center gap-2
    rounded-xl px-8 py-3
    text-xl font-medium text-white
    shadow-xs
    bg-linear-to-t from-sky-500 to-indigo-500
    cursor-pointer
    hover:from-sky-400 hover:to-indigo-400
    disabled:opacity-60 disabled:cursor-not-allowed
    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500
  `}
      >
        {loading && (
          <svg
            className="h-5 w-5 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 26 26"
          >
            <circle
              className="opacity-25"
              cx="13"
              cy="13"
              r="8"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}

        {loading ? "Running…" : "Run"}
      </button>
    </div>
  );
};

export default TextareaBlock;
