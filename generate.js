import fs from 'fs';
import path from 'path';
import axios from 'axios';
import yaml from 'yaml';
import exec, { ChildProcess } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

const config = yaml.parse(fs.readFileSync('config.yaml', 'utf8'));

let pythonPrefix;
  if (os.platform() === 'win32') {
    pythonPrefix = 'py'
  } else {
    pythonPrefix = 'python3'
  }

exec.execSync(`${pythonPrefix} ./fetch_remote_config.py`, { stdio: 'inherit' });

import { lookupByTecci } from './generators/stationLookup.js';

import { generateDaily } from "./generators/daily.js";
import { generateDaypart } from "./generators/daypartfcst.js";
import { generateHourly } from "./generators/hourly.js";
import { generateCurrent } from "./generators/current.js";

const API_KEY = config.API.WEATHER_API_KEY;
const units = config.API.UNITS;
const DATA_INTERVAL_MINUTES = config.SYSTEM.DATA_MINUTE_INTERVAL;

const interest_list = JSON.parse(fs.readFileSync('./remote/interest_lists.json', 'utf8'));
//const obs_interest_list = interest_list.obsStation
const coop_interest_list = interest_list.coopId

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, 'output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}


async function fetchDaily(lat, lon) {
  const url = "https://api.weather.com/v3/wx/forecast/daily/7day";

  const params = {
    geocode: `${lat},${lon}`,
    format: "json",
    units: units,
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
    units: units,
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
    units: units,
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
    units: units,
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
    path.join(OUTPUT_DIR, `${coopid}_daily.py`),
    dailyPy
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${coopid}_daypart.py`),
    daypartPy
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${coopid}_hourly.py`),
    hourlyPy
  );
    fs.writeFileSync(
    path.join(OUTPUT_DIR, `${coopid}_current.py`),
    currentPy
  );
  console.log(`Finished generating products for ${coopid}`);
}


async function provisionIntelliStar() {

  try {
    console.log("Starting provisioning to IntelliStar...");
    exec.execSync(`${pythonPrefix} provision.py`, { stdio: 'inherit' });
    console.log("Provisioning completed successfully.");
  } catch (error) {
    console.error("hol up twin")
    console.error("Provisioning failed:", error);
    console.error("Is Python in your PATH?")
  }
}

function mainLoop() {
  console.log("Starting generation for forecast products...");
  for (const coopid of coop_interest_list) {
    generateForTecci(coopid).catch(err => {
      console.error(`Error generating for COOP ID ${coopid}:`, err);
    });
  }

  provisionIntelliStar();
}

function countdown(seconds) {
  return new Promise((resolve) => {
    let remaining = seconds;
    
    const interval = setInterval(() => {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      process.stdout.write(`\rNext update in: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} `);
      
      remaining--;
      
      if (remaining < 0) {
        clearInterval(interval);
        process.stdout.write('\r                              \r');
        resolve();
      }
    }, 1000);
  });
}

async function runLoop() {
  while (true) {
    mainLoop();
    console.log(`\nWaiting ${DATA_INTERVAL_MINUTES} minutes until next update...`);
    await countdown(DATA_INTERVAL_MINUTES * 60);
  }
}

runLoop();
