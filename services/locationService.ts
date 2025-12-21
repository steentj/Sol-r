import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getLocationName(lat: number, lng: number, locale: string = 'en'): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Identify the city and country for latitude ${lat} and longitude ${lng}. Return ONLY the location name in the format "City, Country" (or "City, Region, Country" if ambiguous). Use the language "${locale}" for the name. Do not include any other text.`,
    });
    
    const text = response.text;
    return text ? text.trim() : `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  } catch (error) {
    console.error("Failed to reverse geocode:", error);
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }
}