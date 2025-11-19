import { GoogleGenAI, Type } from "@google/genai";
import type { PublicListingPageRequestModel } from "../types";

const apiKey = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey });

export const enhanceListingWithAI = async (
  listingName: string
): Promise<{ field: string; value: string; operator: string } | null> => {
  try {
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
    console.error("Gemini enhancement failed", e);
    return null;
  }
};
