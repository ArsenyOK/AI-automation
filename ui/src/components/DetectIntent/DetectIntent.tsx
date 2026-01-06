import CheckIcons from "../icons/CheckIcons";
import Actions from "./Actions";
import ActionsSkeleton from "./ActionsSkeleton";

interface DetectIntentProps {
  detect: boolean;
  runData: any;
  loading: boolean;
  setExecuteResult: (data: any) => void;
  executeResult: any;
}

const DetectIntent = ({
  detect,
  runData,
  loading,
  setExecuteResult,
  executeResult,
}: DetectIntentProps) => {
  return (
    <div
      className={`mt-6 border-1 border-[#D5D7E3] rounded-xl transition-all duration-300 ease-out
    ${detect ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      <div className="flex justify-between items-center mb-2 p-5 font-sans rounded-t-xl w-full bg-[#F1F1F6] border-b-1 border-[#D5D7E3]">
        <div className="flex gap-2 items-center">
          <div className="text-[#1B1D32] text-xl font-medium">
            Detected Intent:
          </div>
          <div className="flex bg-emerald-50 text-emerald-700 border-emerald-100 border-1 font-semibold rounded-xl px-3 py-1 gap-2 items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="3"
              stroke="currentColor"
              className="size-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
            create_tasks
          </div>
          <CheckIcons />
        </div>
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            className="size-10"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
            />
          </svg>
        </div>
      </div>
      {loading ? (
        <ActionsSkeleton />
      ) : (
        <Actions
          runData={runData}
          setExecuteResult={setExecuteResult}
          executeResult={executeResult}
        />
      )}
    </div>
  );
};

export default DetectIntent;
