import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return Response.json({ error: "GOOGLE_API_KEY is not set" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

    // Using gemini-1.5-flash as it is a reliable model for vision tasks
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = "Identify the main item in this image. Return JSON only with these fields: product_name, brands (guess if visible), quantity (estimated count or weight), nutriscore_grade (A/B/C/D/E estimate based on healthiness), category. Do not use markdown formatting.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    return Response.json({ output: text });
  } catch (error) {
    console.error("Error processing image:", error);
    return Response.json({ error: "Failed to process image" }, { status: 500 });
  }
}
