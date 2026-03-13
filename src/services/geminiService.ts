import {GoogleGenAI, Type} from '@google/genai';
import {getApiBaseUrl, getGeminiApiKey} from '../core/env';

export interface AiSuggestion {
  field: string;
  value: string;
  operator: string;
}

export const enhanceListingWithAI = async (listingName: string): Promise<AiSuggestion | null> => {
  const localApiKey = getGeminiApiKey();

  if (localApiKey) {
    try {
      const ai = new GoogleGenAI({apiKey: localApiKey});
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Given the e-commerce listing page name "${listingName}", suggest a single likely filter rule to populate this page.
        Standard fields are often 'ec_brand', 'ec_category', 'ec_price', 'ec_color'.
        Operators: 'isExactly', 'contains'.
        Return JSON only.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              field: {type: Type.STRING, description: 'The field to filter on, e.g. ec_category'},
              operator: {type: Type.STRING, description: 'The operator, e.g. contains or isExactly'},
              value: {type: Type.STRING, description: 'The value to filter by'},
            },
          },
        },
      });

      return response.text ? (JSON.parse(response.text) as AiSuggestion) : null;
    } catch (error) {
      console.error('Local Gemini enhancement failed', error);
      return null;
    }
  }

  const apiBaseUrl = getApiBaseUrl();
  if (apiBaseUrl === '' && window.location.protocol.startsWith('chrome-extension')) {
    console.warn('AI enhancement is unavailable because VITE_CMH_API_BASE_URL is not configured for the extension build.');
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/enhance`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({listingName}),
    });

    if (!response.ok) {
      throw new Error(`Serverless AI error: ${response.statusText}`);
    }

    return (await response.json()) as AiSuggestion;
  } catch (error) {
    console.error('Serverless Gemini enhancement failed', error);
    return null;
  }
};
