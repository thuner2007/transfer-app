import { prisma } from "../../../../../lib/PrismaClient";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { collectionId, password } = body;

    // Check if collection exists and password is correct
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return new Response(
        JSON.stringify({ verified: false, error: "Collection not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!collection.password) {
      return new Response(JSON.stringify({ verified: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Convert both to strings for comparison
    const collectionPassword = String(collection.password);
    const inputPassword = String(password);

    if (collectionPassword !== inputPassword) {
      return new Response(
        JSON.stringify({ verified: false, error: "Invalid password" }),
        {
          status: 200, // Changed to 200 so frontend can read the JSON response
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ verified: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error checking password:", error);
    return new Response(
      JSON.stringify({ verified: false, error: "Failed to check password" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
