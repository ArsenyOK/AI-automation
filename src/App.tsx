import { useState } from "react";
import "./App.css";
import DetectIntent from "./components/DetectIntent/DetectIntent";
import Settingsblock from "./components/SettingsBlock/Settingsblock";
import TextareaBlock from "./components/TextareaBlock/TextareaBlock";

const App = () => {
  const [detect, setDetect] = useState(false);

  const toggleDetect = () => {
    setDetect(true);
  };

  return (
    <div className="w-full h-screen wrapper flex items-start justify-center bg-[#E5E7ED]">
      <div className="rounded-xl shadow-md font-sans w-300 h-96 bg-[#FBFBFD] m-10 border-1 border-[#D5D7E3]">
        <div className="w-full flex-initial bg-[#F1F1F6] rounded-t-xl flex justify-between items-center p-5 border-b-1 border-[#ECEDF4]">
          <div className="text-2xl font-medium">AI Prompt → Action Engine</div>
          <Settingsblock />
        </div>
        <div className="mt-6 mx-4">
          <TextareaBlock toggleDetect={toggleDetect} />
          <DetectIntent detect={detect} />
        </div>
      </div>
    </div>
  );
};

export default App;
