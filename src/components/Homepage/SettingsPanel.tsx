import { useState } from "react";
import { expirationDropdownOptions } from "../../lib/app/expirationDropdownOptions";
import { useTranslations } from "next-intl";

interface SettingsPanelProps {
  passwordRequired: boolean;
  setPasswordRequired: (value: boolean) => void;
  passwordInput: string;
  setPasswordInput: (value: string) => void;
  emailNotification: boolean;
  setEmailNotification: (value: boolean) => void;
  expirationTime: number;
  setExpirationTime: (value: number) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  passwordRequired,
  setPasswordRequired,
  passwordInput,
  setPasswordInput,
  emailNotification,
  setEmailNotification,
  expirationTime,
  setExpirationTime,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const t = useTranslations("SettingsPanel");

  return (
    <div className="border border-gray-400 p-3 md:p-4 rounded-md w-full flex items-center justify-center flex-col gap-2">
      {/* Password input with checkbox */}
      <div className="flex items-center border border-gray-400 p-2 rounded-md w-full mt-2 overflow-hidden">
        <input
          checked={passwordRequired}
          onChange={() => {
            setPasswordRequired(!passwordRequired);
            if (passwordRequired) {
              setPasswordInput("");
            }
          }}
          type="checkbox"
          className="mr-2 w-6 h-6 md:w-5 md:h-5 rounded-md appearance-none border-2 border-gray-400 checked:bg-blue-500 checked:border-blue-500 relative checked:after:content-['✕'] checked:after:text-white checked:after:text-base md:checked:after:text-sm checked:after:font-bold checked:after:absolute checked:after:top-0 checked:after:left-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:w-full checked:after:h-full flex-shrink-0"
        />
        <input
          disabled={!passwordRequired}
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          type="password"
          className={`w-0 min-w-0 flex-1 md:max-w-none outline-none p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
            passwordRequired ? "bg-white" : "cursor-not-allowed"
          }`}
          placeholder={t("password")}
        />
      </div>

      {/* Expiration time */}
      <div className="flex items-center justify-between w-full mt-2 border border-gray-400 p-2 rounded-md">
        <span className="text-base md:text-md text-gray-700">
          {t("expirationTime")}:
        </span>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between px-2 py-1 text-md text-gray-700 bg-white min-w-[80px] text-left cursor-pointer"
          >
            {t(
              expirationDropdownOptions.find(
                (opt) => opt.value === expirationTime
              )?.label || ""
            )}
            <svg
              className={`w-8 h-8 ml-2 transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                stroke="#a1a1aa"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m6 8 4 4 4-4"
              />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[100px]">
              {expirationDropdownOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setExpirationTime(option.value);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg transition-colors cursor-pointer ${
                    expirationTime === option.value
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700"
                  }`}
                >
                  {t(option.label)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expiration info */}
      <p className="w-full text-base md:text-md text-gray-700">
        {t("linkExpiresInDays", { days: expirationTime })}
      </p>

      {/* Email notification toggle */}
      <div className="flex items-center w-full mt-2">
        <button
          onClick={() => setEmailNotification(!emailNotification)}
          className={`relative inline-flex h-8 w-14 md:h-6 md:w-11 items-center rounded-full transition-colors flex-shrink-0 ${
            emailNotification ? "bg-blue-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-6 w-6 md:h-4 md:w-4 transform rounded-full bg-white transition-transform ${
              emailNotification
                ? "translate-x-7 md:translate-x-6"
                : "translate-x-1"
            }`}
          />
        </button>
        <span className="ml-3 text-base md:text-sm text-gray-700">
          {t("emailMeWhenDownloaded")}
        </span>
      </div>
    </div>
  );
};

export default SettingsPanel;
