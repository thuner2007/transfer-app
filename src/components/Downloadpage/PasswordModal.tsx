"use client";
import React from "react";
import { BACKEND_URL, ERROR_MESSAGES } from "../../lib/api/constants";
import axios from "axios";

interface PasswordModalProps {
  passwordInput: string;
  setPasswordInput: (value: string) => void;
  passwordError: string;
  setPasswordError: (value: string) => void;
  setOpenPasswordModal: (value: boolean) => void;
  collectionId: string;
  fetchDownloadInfo: () => void;
  t: (key: string) => string;
}

const PasswordModal: React.FC<PasswordModalProps> = ({
  passwordInput,
  setPasswordInput,
  passwordError,
  setPasswordError,
  setOpenPasswordModal,
  collectionId,
  fetchDownloadInfo,
  t,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4">{t("passwordProtected")}</h2>
        <p className="mb-4">{t("enterPassword")}</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("password")}
          </label>
          <input
            type="text"
            value={passwordInput}
            placeholder={t("enterPasswordPlaceholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
            onChange={(e) => {
              setPasswordInput(e.target.value);
            }}
          />
        </div>

        {passwordError && <p className="text-red-500 mb-4">{passwordError}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => setOpenPasswordModal(false)}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors cursor-pointer"
          >
            {t("close")}
          </button>
          <button
            onClick={async () => {
              try {
                const response = await axios.post(
                  `${BACKEND_URL}/file/check-password/password-validation`,
                  {
                    collectionId: collectionId,
                    password: passwordInput,
                  }
                );
                if (response.data.verified) {
                  setOpenPasswordModal(false);
                  fetchDownloadInfo();
                } else {
                  setPasswordError(
                    response.data.error || ERROR_MESSAGES.PASSWORD_INCORRECT
                  );
                }
              } catch (err) {
                console.error("Failed to verify password:", err);
                if (axios.isAxiosError(err) && err.response?.data?.error) {
                  setPasswordError(err.response.data.error);
                } else {
                  setPasswordError(ERROR_MESSAGES.PASSWORD_VERIFY_FAILED);
                }
              }
            }}
            className={
              "flex-1 font-bold py-2 px-4 rounded-md transition-colors bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
            }
          >
            {t("verify")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;
