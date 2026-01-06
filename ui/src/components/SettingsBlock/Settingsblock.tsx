import SettingsIcon from "../icons/SettingsIcon";

type SettingsBlockProps = {
  onOpenHistory: () => void;
};

export const SettingsBlock = ({ onOpenHistory }: SettingsBlockProps) => {
  return (
    <button
      type="button"
      onClick={onOpenHistory}
      className="flex items-center gap-x-2 text-[#7A7E96] px-3 py-2 shadow-sm rounded-xl bg-white cursor-pointer hover:bg-slate-50 transition"
    >
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <span className="text-sm font-medium">History</span>
      </div>

      <div className="h-6 w-px bg-slate-200" />

      <div className="flex items-center gap-2">
        <SettingsIcon />
      </div>

      <div className="h-6 w-px bg-slate-200" />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
        />
      </svg>
    </button>
  );
};

export default SettingsBlock;
