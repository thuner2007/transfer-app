import QRCode from "qrcode";

export const generateQRCode = async (url: string): Promise<string> => {
  try {
    const qrDataURL = await QRCode.toDataURL(url, {
      width: 120,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return qrDataURL;
  } catch (error) {
    console.error("Error generating QR code:", error);
    return "";
  }
};
