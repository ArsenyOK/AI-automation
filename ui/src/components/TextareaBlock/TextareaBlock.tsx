import { useState } from "react";

interface TextareaBlockProps {
  toggleDetect: () => void;
  setRunData: (data: any) => void;
}

const TextareaBlock = ({ toggleDetect, setRunData }: TextareaBlockProps) => {
  const [text, setText] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const fetchData = async (text: string) => {
    const planRes = await fetch("http://localhost:3001/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text, dryRun: false }),
    });

    if (!planRes.ok) {
      const errText = await planRes.text();
      throw new Error(`Plan error: ${planRes.status} ${errText}`);
    }

    const plan = await planRes.json();

    if (plan?.runId) {
      setRunData(plan);
    }

    let executeResult = null;

    // if (plan?.runId) {
    //   const execRes = await fetch(
    //     `http://localhost:3001/api/runs/${plan.runId}/execute`,
    //     { method: "POST" }
    //   );

    //   if (!execRes.ok) {
    //     const errText = await execRes.text();
    //     throw new Error(`Execute error: ${execRes.status} ${errText}`);
    //   }

    //   executeResult = await execRes.json();
    // }

    // console.info("PLAN:", plan);
    console.info("EXECUTE:", executeResult);

    return { plan, executeResult };
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
      <input
        id="email-address"
        type="email"
        name="email"
        required
        value={text}
        onChange={handleChange}
        placeholder="Plan my task for the next week and send the list to my eamil"
        className="min-w-0 flex-auto rounded-xl bg-[#F7F6FA] px-3.5 font-medium text-md py-2 border-2 border-gray-200 outline-1 -outline-offset-1 outline-white/5 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
      />
      <button
        onClick={onSubmit}
        className="flex-none rounded-xl bg-linear-to-t from-sky-500 to-indigo-500 px-8 text-sm font-semibold text-white shadow-xs text-xl font-medium hover:bg-indigo-400 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      >
        Run
      </button>
    </div>
  );
};

export default TextareaBlock;
