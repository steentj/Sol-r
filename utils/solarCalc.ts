// Solar calculation utility
// Based on NOAA solar calculations

const toRadians = (deg: number) => (deg * Math.PI) / 180;
const toDegrees = (rad: number) => (rad * 180) / Math.PI;

/**
 * Calculates sunrise and sunset times for a given date and location.
 * Returns Date objects or null if the sun doesn't rise/set (polar day/night).
 */
export const getSunTimes = (date: Date, latitude: number, longitude: number) => {
  const times = {
    sunrise: null as Date | null,
    sunset: null as Date | null,
  };

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Calculate Julian Day
  // JS Date is milliseconds since epoch. Julian date at epoch is 2440587.5
  // But we need the Julian day for the specific day at noon roughly
  // It's simpler to implement the generalized algorithm step by step
  
  // 1. first calculate the day of the year
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = startOfDay.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const N = Math.floor(diff / oneDay) + 1;

  // 2. convert the longitude to hour value and calculate an approximate time
  const lngHour = longitude / 15;
  
  // We do this twice, once for sunrise (t_rise = N + (6 - lngHour) / 24)
  // and once for sunset (t_set = N + (18 - lngHour) / 24)
  
  const calculateTime = (isSunrise: boolean): Date | null => {
    const t = N + ((isSunrise ? 6 : 18) - lngHour) / 24;

    // 3. calculate the Sun's mean anomaly
    const M = (0.9856 * t) - 3.289;

    // 4. calculate the Sun's true longitude
    let L = M + (1.916 * Math.sin(toRadians(M))) + (0.020 * Math.sin(toRadians(2 * M))) + 282.634;
    L = L % 360;
    if (L < 0) L += 360;

    // 5. calculate the Sun's right ascension
    let RA = toDegrees(Math.atan(0.91764 * Math.tan(toRadians(L))));
    RA = RA % 360;
    if (RA < 0) RA += 360;

    // 5.1 right ascension value needs to be in the same quadrant as L
    const Lquadrant = (Math.floor(L / 90)) * 90;
    const RAquadrant = (Math.floor(RA / 90)) * 90;
    RA = RA + (Lquadrant - RAquadrant);

    // 5.2 right ascension value needs to be converted into hours
    RA = RA / 15;

    // 6. calculate the Sun's declination
    const sinDec = 0.39782 * Math.sin(toRadians(L));
    const cosDec = Math.cos(Math.asin(sinDec));

    // 7a. calculate the Sun's local hour angle
    // zenith: 90 deg 50 min (official) => 90.8333
    const zenith = 90.8333;
    const cosH = (Math.cos(toRadians(zenith)) - (sinDec * Math.sin(toRadians(latitude)))) / (cosDec * Math.cos(toRadians(latitude)));

    if (cosH > 1) {
      // The sun never rises on this location (on the specified date)
      return null;
    }
    if (cosH < -1) {
      // The sun never sets on this location (on the specified date)
      return null; 
    }

    // 7b. finish calculating H and convert into hours
    let H = isSunrise 
      ? 360 - toDegrees(Math.acos(cosH)) 
      : toDegrees(Math.acos(cosH));
    
    H = H / 15;

    // 8. calculate local mean time of rising/setting
    const T = H + RA - (0.06571 * t) - 6.622;

    // 9. adjust back to UTC
    let UT = T - lngHour;
    
    // Normalize to 0-24
    if (UT < 0) UT += 24;
    if (UT > 24) UT -= 24;

    // Convert decimal UTC hours to Date object
    // We start with the base UTC date
    const resultDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const hours = Math.floor(UT);
    const minutes = Math.floor((UT - hours) * 60);
    const seconds = Math.floor(((UT - hours) * 60 - minutes) * 60);
    
    resultDate.setUTCHours(hours, minutes, seconds);
    
    return resultDate;
  };

  times.sunrise = calculateTime(true);
  times.sunset = calculateTime(false);

  return times;
};