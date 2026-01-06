import CheckIcons from "../icons/CheckIcons";
import ActionItem from "./ActionItem/ActionItem";

interface ActionsProps {
  runData: any;
}

const Actions = ({ runData }: ActionsProps) => {
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
          />
        ))}
        {/* <div className="flex bg-[#DFECEB] rounded-md px-3 py-2 gap-2 items-center text-[#256D3B]">
          <CheckIcons />
          Email sent successfully at 2:30 PM.
        </div> */}
      </div>
    </div>
  );
};

export default Actions;
