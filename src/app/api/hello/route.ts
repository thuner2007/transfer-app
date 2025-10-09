// Import cleanup service to auto-start it
import "../../../cleanup-service";

export async function GET() {
  return Response.json({ message: "Hello World" });
}
