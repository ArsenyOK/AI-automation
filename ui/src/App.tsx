import { useState } from "react";
import "./App.css";
import DetectIntent from "./components/DetectIntent/DetectIntent";
import TextareaBlock from "./components/TextareaBlock/TextareaBlock";
import SettingsBlock from "./components/SettingsBlock/Settingsblock";
import { HistoryModal } from "./components/SettingsBlock/HistoryModal";

const App = () => {
  const [detect, setDetect] = useState(false);
  const [runData, setRunData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const historyItems: any[] = [
    {
      id: "1",
      title: "Keys to prioritize",
      timeLabel: "Today, 10:32 AM",
      intent: "create_tasks",
      snippetLines: [
        "Gym, Meditation, Project Launch plan",
        "Focus on exercise, meditation, and new project set-up.",
      ],
    },
    {
      id: "2",
      title: "My plan for next week",
      timeLabel: "Today, 9:17 AM",
      intent: "create_tasks",
      snippetLines: [
        "Gym, Main meeting, Meditation, Reading, Create own project.",
        "Drive balance between work, self-care, and growth.",
      ],
    },
  ];

  const toggleDetect = () => {
    setDetect(true);
  };

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
            <SettingsBlock onOpenHistory={() => setHistoryOpen(true)} />

            <HistoryModal
              open={historyOpen}
              onClose={() => setHistoryOpen(false)}
              items={historyItems}
              activeId={activeHistoryId}
              onSelectItem={(id) => {
                setActiveHistoryId(id);
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
          />
          <DetectIntent loading={loading} runData={runData} detect={detect} />
        </div>
      </div>
    </div>
  );
};

export default App;
