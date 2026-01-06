import { useState } from "react";
import "./App.css";
import DetectIntent from "./components/DetectIntent/DetectIntent";
import Settingsblock from "./components/SettingsBlock/Settingsblock";
import TextareaBlock from "./components/TextareaBlock/TextareaBlock";

const App = () => {
  const [detect, setDetect] = useState(false);
  const [runData, setRunData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

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
          <Settingsblock />
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
