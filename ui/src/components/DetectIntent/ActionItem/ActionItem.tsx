import { useState } from "react";
import SettingsIcon from "../../icons/SettingsIcon";

const ActionItem = ({
  number,
  action,
  preview,
  plan,
  setIsDoneExecute,
  setExecuteResult,
  executeResult,
}: any) => {
  const [isExecuting, setIsExecuting] = useState(false);

  const executeRunId = async () => {
    if (!plan?.runId) {
      throw new Error("runId is missing. Click RUN first.");
    }

    try {
      setIsExecuting(true);

      const execRes = await fetch(
        `http://localhost:3001/api/runs/${plan.runId}/execute`,
        { method: "POST" }
      );

      if (!execRes.ok) {
        const errText = await execRes.text();
        throw new Error(`Execute error: ${execRes.status} ${errText}`);
      }

      const data = await execRes.json();
      setExecuteResult(data);
      setIsDoneExecute(data.logs);

      console.info(data, "executeResult");
      return data;
    } finally {
      setIsExecuting(false);
    }
  };

  const priorityOrder: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

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
            <span className="bg-[#F1F1F6] rounded-xl px-3 py-1 gap-2 items-center">
              {action.input.time_range.type === "custom"
                ? action.input.time_range.end_date
                : action.input.time_range.value}
            </span>
          </div>
          <SettingsIcon />
        </div>
        {preview && !executeResult ? (
          <div className="flex flex-col mt-2 gap-4">
            <div className="flex w-full flex-col gap-1 mt-4  p-5 border-1 border-[#D5D7E3] bg-[#F1F1F6] rounded-xl">
              <div className="text-xl font-medium">
                Preview task <span className="font-normal">candidates:</span>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {preview?.task_candidates.map((task: string, index: number) => {
                  return (
                    <div className="flex gap-2" key={index}>
                      <div className="flex justify-center items-center w-[26px] h-[26px] p-1 bg-[#5EAE95] rounded-full text-white">
                        {index + 1}
                      </div>
                      {task}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-start items-center gap-2 mt-2 font-normal text-md">
              <div className="w-[10px] h-[10px] bg-[#A8ADD3] rounded-full"></div>
              {preview?.summary}
            </div>
            <div className="flex justify-end items-center gap-4 mt-2">
              <button className="flex justify-center items-center gap-1 rounded-xl bg-white py-2 border-1 border-[#D5D7E3] px-5 text-sm font-semibold text-black shadow-xs text-xl font-medium hover:bg-[#52525C] hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
                Edit
              </button>

              <button
                onClick={() => executeRunId()}
                disabled={isExecuting}
                className={`
    flex items-center justify-center gap-1 rounded-xl bg-[#00AA44] px-8 py-2 text-sm font-semibold text-white shadow-xs text-xl font-medium hover:bg-green-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600
    disabled:opacity-60 disabled:cursor-not-allowed
    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500
  `}
              >
                {isExecuting && (
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

                {isExecuting ? "Running…" : " Confirm & Execute"}
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`border-1 border-[#D5D7E3] animate-fade-in transition-all duration-300 ease-out p-5 mt-4 rounded-xl bg-[#F9F9FB] ${
              executeResult
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
          >
            <div className=" ml-1 pb-3 pl-3">
              {[...executeResult.results.tasks]
                .sort(
                  (a, b) =>
                    (priorityOrder[a.priority] ?? 99) -
                    (priorityOrder[b.priority] ?? 99)
                )
                .map((task, index) => {
                  return (
                    <div key={`${task.title}-${index}`}>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-[10px] h-[10px] bg-[#6181EF] rounded-full" />

                        <div
                          title={`${task.priority} priority`}
                          className="flex justify-center items-center w-[32px] h-[32px] rounded-full text-white"
                          style={{
                            backgroundColor:
                              task.priority === "high"
                                ? "#E7000B"
                                : task.priority === "medium"
                                ? "#FF6900"
                                : "#155DFC",
                          }}
                        >
                          {task.priority === "high"
                            ? "H"
                            : task.priority === "medium"
                            ? "M"
                            : "L"}
                        </div>

                        <div className="flex-1 text-xl font-normal ml-2">
                          <span className="font-medium">{task.title}.</span>{" "}
                          {task.reason}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="flex flex-col border-1 border-[#D5D7E3] justify-start text-xl bg-[#EBEAF8] items-start p-5 bg-[#E9E9F7]s rounded-xl gap-2 mt-2 font-normal text-md">
              <div className="flex items-center justify-center text-[#565E85] font-medium uppercase tracking-wide text-indigo-500 font-semibold">
                {" "}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="#FD9D29"
                  className="h-9 w-9 text-indigo-500"
                >
                  <path d="M12 3l1.7 3.8L18 8.5l-3 3 0.7 4.3L12 14l-3.7 1.8L9 11.5l-3-3 4.3-1.7L12 3z" />
                  <path d="M5 3l.8 1.8L8 5.6 6.4 7l.4 2-1.8-1L3.2 9l.4-2L2 5.6l2.2-.8L5 3z" />
                </svg>
                AI Coach insight
              </div>
              <div className="font-normal">
                {executeResult.results?.advice?.message}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionItem;
