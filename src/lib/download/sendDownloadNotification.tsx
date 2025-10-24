import axios from "axios";
import { BACKEND_URL } from "../api/constants";

export const sendDownloadNotification = async (collectionId: string) => {
  try {
    await axios.post(`${BACKEND_URL}/mail/downloadedNotification`, {
      collectionId: collectionId,
    });
  } catch (error) {
    console.error("Error sending download notification:", error);
  }
};
