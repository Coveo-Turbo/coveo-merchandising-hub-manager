import { GoogleGenAI, Type } from "@google/genai";

// Hybrid Architecture:
// 1. If API_KEY is present (Local Dev), use direct SDK call.
// 2. If missing (Production), use Serverless API route to hide key.

export const enhanceListingWithAI = async (
  listingName: string
): Promise<{ field: string; value: string; operator: string } | null> => {
  
  // --- OPTION 1: Local Development (Direct SDK via .env) ---
  if (process.env.API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      if (!text) return null;
      return JSON.parse(text);

    } catch (e) {
      console.error("Local Gemini enhancement failed", e);
      return null;
    }
  } 
  
  // --- OPTION 2: Production (Serverless Proxy via Netlify Functions) ---
  else {
    try {
      // Uses the rewrite defined in netlify.toml
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ listingName }),
      });

      if (!response.ok) {
        throw new Error(`Serverless AI error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (e) {
      console.error("Serverless Gemini enhancement failed", e);
      return null;
    }
  }
};