import fs from 'fs';
import path from 'path';
import axios from 'axios';

import { lookupByTecci } from './generators/stationLookup.js';

import { generateDaily } from "./generators/daily.js";
import { generateDaypart } from "./generators/daypartfcst.js";
import { generateHourly } from "./generators/hourly.js";
import { generateCurrent } from "./generators/current.js";

const API_KEY = 'e1f10a1e78da46f5b10a1e78da96f525';

const OUTPUT_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function fetchDaily(lat, lon) {
  const url = "https://api.weather.com/v3/wx/forecast/daily/7day";

  const params = {
    geocode: `${lat},${lon}`,
    format: "json",
    units: "e",
    language: "en-US",
    apiKey: API_KEY
  };

  console.log("DAILY REQUEST PARAMS:", params);

  const response = await axios.get(url, { params });
  return response.data;
}





async function fetchDaypart(lat, lon) {
  const url = "https://api.weather.com/v3/wx/forecast/daily/7day";

  const params = {
    geocode: `${lat},${lon}`,
    format: "json",
    units: "e",
    language: "en-US",
    apiKey: API_KEY
  };

  console.log("DAYPART REQUEST PARAMS:", params);

  const response = await axios.get(url, { params });
  return response.data;
}



async function fetchHourly(lat, lon) {
  const url = "https://api.weather.com/v3/wx/forecast/hourly/2day";

  const params = {
    geocode: `${lat},${lon}`,
    format: "json",
    units: "e",
    language: "en-US",
    apiKey: API_KEY
  };

  console.log("HOURLY REQUEST PARAMS:", params);

  const response = await axios.get(url, { params });
  return response.data;
}

async function fetchCurrent(lat, lon) {
  const url = "https://api.weather.com/v3/wx/observations/current";

  const params = {
    geocode: `${lat},${lon}`,
    format: "json",
    units: "e",
    language: "en-US",
    apiKey: API_KEY
  };

  console.log("CURRENT REQUEST PARAMS:", params);

  const response = await axios.get(url, { params });
  return response.data;
}

async function generateForTecci(coopid) {
  console.log(`Resolving COOP/TECCI ID ${coopid}`);

  const station = await lookupByTecci(coopid);
  const lat = Number(station.lat);
  const lon = Number(station.lon);
  console.log("Using lat/lon:", lat, lon);

  console.log(
    `Location resolved: ${station.city}, ${station.state} (${lat}, ${lon})`
  );

  const dailyData = await fetchDaily(lat, lon);
  const daypartData = await fetchDaypart(lat, lon);
  const hourlyData = await fetchHourly(lat, lon);
  const currentData = await fetchCurrent(lat, lon);

  dailyData.location = coopid;
  daypartData.location = coopid;
  hourlyData.location = coopid;
  currentData.location = "T"+coopid;


  console.log("Daily Data:", dailyData);
  console.log("Daypart Data:", daypartData);
  console.log("Hourly Data:", hourlyData);

  const dailyPy = generateDaily(dailyData);
  const daypartPy = generateDaypart(daypartData);
  const hourlyPy = generateHourly(hourlyData);
  const currentPy = generateCurrent(currentData);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `daily.py`),
    dailyPy
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `daypart.py`),
    daypartPy
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `hourly.py`),
    hourlyPy
  );
    fs.writeFileSync(
    path.join(OUTPUT_DIR, `current.py`),
    currentPy
  );

  console.log(`Finished generating products for ${coopid}`);
}

const coopid = process.argv[2];
if (!coopid) {
  console.error('Usage: node generator.js <COOPID>');
  process.exit(1);
}

generateForTecci(coopid).catch(err => {
  console.error('Generator failed:', err);
});
