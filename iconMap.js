// iconMap.js
module.exports = {
  // --- Drizzle ---
  9: 6003,   // AM Drizzle
  10: 900,   // Drizzle
  8: 800,    // Freezing Drizzle

  // --- Rain ---
  11: 1100,  // Showers
  12: 1200,  // Rain
  40: 3900,  // Scattered Showers

  // --- Thunderstorms ---
  15: 400,   // Thunderstorms
  16: 402,   // Heavy Thunderstorms

  // --- Snow ---
  13: 1300,  // Flurries
  14: 1600,  // Snow
  41: 4100,  // Snow Showers
  42: 4200,  // Heavy Snow

  // --- Atmosphere ---
  20: 2000,  // Fog
  21: 2100,  // Haze

  // --- Clouds / Clear ---
  26: 2600,  // Cloudy
  28: 2800,  // Mostly Cloudy
  30: 3000,  // Partly Cloudy
  32: 3200,  // Sunny
  34: 3400,  // Mostly Sunny

  // --- Night variants ---
  31: 3100,  // Clear (night)
  29: 2900,  // Partly Cloudy (night)
  27: 2700,  // Mostly Cloudy (night)

  // --- Fallback ---
  default: 2600 // Cloudy
};
