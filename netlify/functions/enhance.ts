import { GoogleGenAI, Type } from "@google/genai";

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing API Key' }), { status: 500 });
    }

    const body = await request.json();
    const { listingName } = body;

    if (!listingName) {
      return new Response(JSON.stringify({ error: 'Missing listingName' }), { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Given the e-commerce listing page name "${listingName}", suggest a single likely filter rule to populate this page.
      Standard fields are often 'ec_brand', 'ec_category', 'ec_price', 'ec_color'.
      Operators: 'isExactly', 'contains'.
      Return JSON only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            field: { type: Type.STRING, description: "The field to filter on, e.g. ec_category" },
            operator: { type: Type.STRING, description: "The operator, e.g. contains or isExactly" },
            value: { type: Type.STRING, description: "The value to filter by" }
          }
        }
      }
    });

    const text = response.text;
    return new Response(text, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("AI Handler Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}