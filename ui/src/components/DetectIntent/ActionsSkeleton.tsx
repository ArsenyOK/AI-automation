const ActionsSkeleton = () => {
  return (
    <div className="mb-2 p-5">
      <div className="h-6 w-24 rounded bg-slate-200 animate-pulse" />

      <div className="mt-4 p-5 border border-[#D5D7E3] shadow-md rounded-xl flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />

          <div className="flex-1">
            <div className="h-5 w-2/3 rounded bg-slate-200 animate-pulse" />

            <div className="mt-4 space-y-3">
              <div className="h-4 w-5/6 rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-slate-200 animate-pulse" />
            </div>
          </div>

          <div className="h-8 w-8 rounded bg-slate-200 animate-pulse" />
        </div>

        <div className="h-px w-full bg-slate-100" />

        <div className="flex gap-4">
          <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />

          <div className="flex-1">
            <div className="h-5 w-1/2 rounded bg-slate-200 animate-pulse" />

            <div className="mt-4 space-y-3">
              <div className="h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-slate-200 animate-pulse" />
            </div>
          </div>

          <div className="h-8 w-8 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default ActionsSkeleton;
