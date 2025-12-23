export async function getLocationName(lat: number, lng: number, locale: string = 'en'): Promise<string> {
  try {
    // Using BigDataCloud's free client-side reverse geocoding API
    // No API key required for client-side usage.
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=${locale}`
    );

    if (!response.ok) {
       return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }

    const data = await response.json();
    
    // Priority: City -> Locality -> Principal Subdivision
    const city = data.city || data.locality || data.principalSubdivision;
    const country = data.countryName;

    if (city && country) {
      return `${city}, ${country}`;
    } else if (country) {
      return country;
    }
    
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  } catch (error) {
    console.error("Failed to reverse geocode:", error);
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }
}