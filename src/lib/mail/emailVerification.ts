import axios from "axios";
import { BACKEND_URL } from "../api/constants";

export interface SendVerificationEmailParams {
  email: string;
  setVerifyModalOpen: (open: boolean) => void;
  setMailVerified: (verified: boolean) => void;
}

export const sendVerificationEmail = async ({
  email,
  setVerifyModalOpen,
  setMailVerified,
}: SendVerificationEmailParams): Promise<boolean> => {
  try {
    const response = await axios.post(`${BACKEND_URL}/mail/send`, {
      email,
    });

    if (response.data.error) {
      return false;
    }

    if (response.data.verifyStatus === "pending") {
      setVerifyModalOpen(true);
      return false;
    } else if (response.data.verifyStatus === "verified") {
      setMailVerified(true);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
};
