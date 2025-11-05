interface PauseButtonProps {
  pauseUpload: () => void;
  t: (key: string) => string;
}

const PauseButton: React.FC<PauseButtonProps> = ({ pauseUpload, t }) => {
  return (
    <button
      onClick={pauseUpload}
      className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xl px-6 p-3 rounded-md transition-all duration-200 cursor-pointer hover:shadow-lg"
      title={t("pause") || "Pause"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>
  );
};

export default PauseButton;
