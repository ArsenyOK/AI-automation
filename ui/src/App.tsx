import { useEffect, useState } from "react";
import "./App.css";
import DetectIntent from "./components/DetectIntent/DetectIntent";
import TextareaBlock from "./components/TextareaBlock/TextareaBlock";
import { HistoryModal } from "./components/SettingsBlock/HistoryModal";
import { SettingsBlock } from "./components/SettingsBlock/Settingsblock";

type StoredRun = {
  id: string;
  title: string;
  timeLabel: string;
  input: string;
  intent: string;
  snippetLines: string[];
  runData: any;
  createdAt: number;
};

const STORAGE_KEY = "ai_action_history_v1";

function loadHistory(): StoredRun[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(items: StoredRun[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const App = () => {
  const [detect, setDetect] = useState(false);
  const [runData, setRunData] = useState<any>(null);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [executeResult, setExecuteResult] = useState<any>(null);
  const [historyItems, setHistoryItems] = useState<StoredRun[]>(() =>
    loadHistory()
  );
  const [isRestoring, setIsRestoring] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const toggleDetect = () => {
    setDetect(true);
  };

  useEffect(() => {
    if (!runData?.runId) return;

    if (isRestoring) {
      setIsRestoring(false);
      return;
    }

    const intent = runData?.detected_intent?.intent ?? "unknown";
    const title =
      intent === "create_tasks"
        ? "Create task list"
        : intent === "summarize_text"
        ? "Summarize text"
        : intent === "generate_email"
        ? "Generate email"
        : "Run";

    const snippetLines = runData?.preview?.task_candidates?.length
      ? [runData.preview.task_candidates.join(", ").slice(0, 80)]
      : runData?.preview?.summary
      ? [runData.preview.summary]
      : ["(no preview)"];

    const item: StoredRun = {
      id: runData.runId,
      title,
      timeLabel: new Date().toLocaleString(),
      intent,
      input: text,
      snippetLines,
      runData,
      createdAt: Date.now(),
    };

    setHistoryItems((prev) => {
      const exists = prev.some((x) => x.id === item.id);

      const next = exists
        ? prev.map((x) => (x.id === item.id ? { ...x, ...item } : x))
        : [item, ...prev];

      saveHistory(next);
      return next;
    });
  }, [runData, isRestoring]);

  return (
    <div className="wrapper w-full flex items-start justify-center py-10">
      <div
        className={`rounded-xl ${
          !detect ? "h-[220px]" : ""
        } shadow-md font-sans w-300 min-h-[220px] pb-10 bg-[#FBFBFD] border-1 border-[#D5D7E3]`}
      >
        <div className="w-full flex-initial bg-[#F1F1F6] rounded-t-xl flex justify-between items-center p-5 border-b-1 border-[#ECEDF4]">
          <div className="text-2xl font-medium">AI Prompt → Action Engine</div>
          <>
            <SettingsBlock
              onOpenHistory={() => setHistoryOpen(true)}
              onResetSession={() => {
                setText("");
                setDetect(false);
                setRunData(null);
                setExecuteResult(null);
                setActiveHistoryId(null);
                setLoading(false);
              }}
            />

            <HistoryModal
              open={historyOpen}
              onClose={() => setHistoryOpen(false)}
              items={historyItems}
              activeId={activeHistoryId}
              onDeleteItem={(id) => {
                setHistoryItems((prev) => {
                  const next = prev.filter((x) => x.id !== id);
                  saveHistory(next);

                  if (activeHistoryId === id) setActiveHistoryId(null);

                  return next;
                });
              }}
              onSelectItem={(id) => {
                setIsRestoring(true);
                setActiveHistoryId(id);

                const selected = historyItems.find((x) => x.id === id);
                console.info(selected, "selected");
                if (!selected) return;

                setText(selected.input || "");
                setRunData(selected.runData);
                setExecuteResult(null);
                setDetect(true);
              }}
            />
          </>
        </div>
        <div className="mt-6 mx-4">
          <TextareaBlock
            setLoading={setLoading}
            loading={loading}
            toggleDetect={toggleDetect}
            setRunData={setRunData}
            setText={setText}
            setExecuteResult={setExecuteResult}
            text={text}
          />
          <DetectIntent
            loading={loading}
            runData={runData}
            detect={detect}
            setExecuteResult={setExecuteResult}
            executeResult={executeResult}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
