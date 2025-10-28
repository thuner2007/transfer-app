import axios from "axios";
import { BACKEND_URL } from "../api/constants";
export const handleDownloadFile = async (
  filename: string,
  collectionId: string
) => {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/file/single?collectionId=${collectionId}&filename=${encodeURIComponent(
        filename
      )}`,
      {
        responseType: "blob",
      }
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  } catch (error) {
    console.error("Error downloading file:", error);
  }
};
