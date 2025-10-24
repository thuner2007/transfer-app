import axios from "axios";
import { BACKEND_URL, ERROR_MESSAGES } from "../../lib/api/constants";

interface VerifyEmailModalProps {
  verificationCode: string;
  setVerificationCode: (code: string) => void;
  verificationError: string;
  setVerificationError: (error: string) => void;
  setMailVerified: (verified: boolean) => void;
  setVerifyModalOpen: (open: boolean) => void;
  userMail: string;
}

const VerifyEmailModal: React.FC<VerifyEmailModalProps> = ({
  verificationCode,
  setVerificationCode,
  verificationError,
  setVerificationError,
  setMailVerified,
  setVerifyModalOpen,
  userMail,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
        <p className="mb-4">
          A verification email has been sent to your email address. Please enter
          the 6-digit verification code from your email below.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verification Code
          </label>
          <input
            type="text"
            maxLength={6}
            value={verificationCode}
            placeholder="Enter 6-digit code"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
            onChange={(e) => {
              // Only allow numbers and limit to 6 digits
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setVerificationCode(value);
            }}
          />
        </div>

        <span className="text-sm text-gray-500 block mb-4">
          NOTE: Also check your spam folder!
        </span>

        {verificationError && (
          <p className="text-red-500 mb-4">{verificationError}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setVerifyModalOpen(false)}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={async () => {
              if (verificationCode.length !== 6) {
                alert("Please enter a 6-digit verification code");
                return;
              }

              try {
                const response = await axios.post(
                  `${BACKEND_URL}/mail/verify`,
                  {
                    code: parseInt(verificationCode),
                    email: userMail,
                  }
                );

                if (response.data.verifyStatus === "success") {
                  setMailVerified(true);
                  setVerifyModalOpen(false);
                  console.log("Email verified successfully!");
                } else {
                  setVerificationError(
                    ERROR_MESSAGES.INVALID_VERIFICATION_CODE
                  );
                }
              } catch (error) {
                console.error("Error verifying code:", error);
                setVerificationError(
                  ERROR_MESSAGES.ERROR_VERIFY_FAILED +
                    ": " +
                    (error as Error).message
                );
              }
            }}
            disabled={verificationCode.length !== 6}
            className={`flex-1 font-bold py-2 px-4 rounded-md transition-colors ${
              verificationCode.length === 6
                ? "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Verify
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailModal;
