import SettingsIcon from "../../icons/SettingsIcon";

const ActionItem = ({ number, action }: any) => {
  console.log(action);
  console.info(
    action.input.time_range.end_date,
    "action.input.time_range.end_time"
  );

  // My plan for next week. Task: The gym, the main meeting, meditation, the reading, create own project
  return (
    <div className="flex">
      <div className="flex flex-col items-center mr-4 gap-2">
        <div
          className={`flex justify-center items-center w-[30px] h-[30px] p-1 bg-[#9AD3B4] rounded-full bg-linear-to-t from-sky-500 to-indigo-500 text-white`}
        >
          {number}
        </div>
        <div className="h-full w-[1px] bg-[#D5D7E3]"></div>
      </div>
      <div className="w-full pb-2">
        <div className="text-[#1B1D32] text-xl font-medium flex justify-between items-center">
          <div>
            Create task list{" "}
            <span className="bg-[#DBE2E9] rounded-xl px-3 py-1 gap-2 items-center">
              {action.input.time_range.type === "custom"
                ? action.input.time_range.end_date
                : action.input.time_range.value}
            </span>
          </div>
          <SettingsIcon />
        </div>
        <div className="border-b-1 border-[#D5D7E3] ml-1 pb-3 pl-3">
          <div className="flex items-center gap-2 mt-2">
            <div className="w-[10px] h-[10px] bg-[#6181EF] rounded-full"></div>
            <div className="flex-1 text-xl font-medium ml-2">
              <span className="text-[#6181EF]">Planning</span>: Define weekly
              priorities.
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-[10px] h-[10px] bg-[#6181EF] rounded-full"></div>
            <div className="flex-1 text-xl font-medium ml-2">
              <span className="text-[#6181EF]">Developer</span>: Work on project
              X, for us on feature Y.
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-[10px] h-[10px] bg-[#6181EF] rounded-full"></div>
            <div className="flex-1 text-xl font-medium ml-2">
              <span className="text-[#6181EF]">Meetings</span>: Team meeting on
              Tuesday morning. Client call on Thursday adternoon.
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-[10px] h-[10px] bg-[#6181EF] rounded-full"></div>
            <div className="flex-1 text-xl font-medium ml-2">
              <span className="text-[#6181EF]">Review</span>: End of week
              project review on Friday.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionItem;
