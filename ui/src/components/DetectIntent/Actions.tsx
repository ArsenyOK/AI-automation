import { useState } from "react";
import CheckIcons from "../icons/CheckIcons";
import ActionItem from "./ActionItem/ActionItem";

interface ActionsProps {
  runData: any;
  setExecuteResult?: (data: any) => void;
  executeResult?: any;
}

const Actions = ({
  runData,
  setExecuteResult,
  executeResult,
}: ActionsProps) => {
  const [isDoneExecute, setIsDoneExecute] = useState(null);
  const [emailData, setEmailData] = useState(null);

  return (
    <div className="mb-2 p-5">
      <div className="text-[#1B1D32] text-xl font-medium">Actions:</div>
      <div className="mt-4  p-5 border-1 border-[#D5D7E3] shadow-md rounded-xl flex flex-col gap-1">
        {runData?.actions.map((action, key) => (
          <ActionItem
            key={key}
            number={key + 1}
            action={action}
            preview={runData.preview}
            plan={runData}
            setIsDoneExecute={setIsDoneExecute}
            setExecuteResult={setExecuteResult}
            executeResult={executeResult}
            setEmailData={setEmailData}
          />
        ))}
        {isDoneExecute && (
          <div className="flex bg-[#DFECEB] rounded-md px-3 py-2 gap-2 items-center text-[#256D3B]">
            <CheckIcons />
            {isDoneExecute[0].type + ": " + isDoneExecute[0].status}
          </div>
        )}
        {emailData && emailData?.email_status?.sent && (
          <div className="flex bg-[#DFECEB] rounded-md px-3 py-2 gap-2 items-center text-[#256D3B]">
            <CheckIcons />
            Email sent successfully to {emailData?.email_status.to}
          </div>
        )}
      </div>
    </div>
  );
};

export default Actions;
