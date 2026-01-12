import fs from 'fs';
import path from 'path';
import axios from 'axios';
import yaml from 'yaml';
import exec from 'child_process';
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

import { searchByObs } from './LFRecord.js';
import { searchByCoopId } from './LFRecord.js';
import { generateDaily } from "./generators/daily.js";
import { generateDaypart } from "./generators/daypartfcst.js";
import { generateHourly } from "./generators/hourly.js";
import { generateCurrent } from "./generators/current.js";

const API_KEY = config.API.WEATHER_API_KEY;
const units = config.API.UNITS;
const DATA_MINUTE_INTERVAL = config.SYSTEM.DATA_MINUTE_INTERVAL;
const NTP_MINUTE_INTERVAL = config.SYSTEM.NTP_MINUTE_INTERVAL;
const RADAR_MINUTE_INTERVAL = config.SYSTEM.RADAR_MINUTE_INTERVAL;

const interest_list = JSON.parse(fs.readFileSync('./remote/interest_lists.json', 'utf8'));
const obs_interest_list = interest_list.obsStation;
const coop_interest_list = interest_list.coopId;

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

  const response = await axios.get(url, { params });
  return response.data;
}

async function aggregate() {
  let current = '';
  let hourly = '';
  let daily = '';
  let daypart = '';

  for (const obs of obs_interest_list) {
    try {
      const locData = await searchByObs(obs);

      if (!locData) {
        console.log(`Skipping ${obs} - not found in LFRecord`);
        continue;
      }
      const lat = locData.lat;
      const lon = locData.long;
      const wxData = await fetchCurrent(lat, lon);
      wxData.location = obs;
      wxData.county = locData.cntyId;
      const pyCode = generateCurrent(wxData);
      current += pyCode + '\n';
    } catch (err) {
      console.error(`Error generating current for ${obs}:`, err.message);
    }
  }

  for (const coopid of coop_interest_list) {
    try {
      const locData = await searchByCoopId(coopid);
      if (!locData) {
        console.log(`Skipping ${coopid} - not found in LFRecord`);
        continue;
      }
      const lat = locData.lat;
      const lon = locData.long;
      const dailyData = await fetchDaily(lat, lon);
      const daypartData = await fetchDaypart(lat, lon);
      const hourlyData = await fetchHourly(lat, lon);
      dailyData.location = coopid;
      daypartData.location = coopid;
      hourlyData.location = coopid;
      const dailyPy = generateDaily(dailyData);
      const daypartPy = generateDaypart(daypartData);
      const hourlyPy = generateHourly(hourlyData);
      daily += dailyPy + '\n';
      daypart += daypartPy + '\n';
      hourly += hourlyPy + '\n';

    } catch (err) {
      console.error(`Error generating forecasts for ${coopid}:`, err.message);
    }
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'current.py'), current);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'daily.py'), daily);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'daypart.py'), daypart);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'hourly.py'), hourly);

  console.log('All products written to output folder.');
}

async function provisionIntelliStar(job) {
  try {
    console.log("Starting provisioning to IntelliStar...");
    exec.execSync(`${pythonPrefix} provision.py --job ${job}`, { stdio: 'inherit' });
    console.log("Provisioning completed successfully.");
  } catch (error) {
    console.error("Provisioning failed:", error);
  }
}

function countdown(dataSeconds, ntpSeconds, radarSeconds) {
  return new Promise((resolve) => {
    if (dataSeconds <= 0 || ntpSeconds <= 0 || radarSeconds <= 0) {
      resolve({
        dataRemaining: Math.max(0, dataSeconds),
        ntpRemaining: Math.max(0, ntpSeconds),
        radarRemaining: Math.max(0, radarSeconds)
      });
      return;
    }
    
    let dataRemaining = dataSeconds;
    let ntpRemaining = ntpSeconds;
    let radarRemaining = radarSeconds;
    
    const interval = setInterval(() => {
      const dataMins = Math.max(0, Math.floor(dataRemaining / 60));
      const dataSecs = dataRemaining >= 0 ? dataRemaining % 60 : 0;
      const ntpMins = Math.max(0, Math.floor(ntpRemaining / 60));
      const ntpSecs = ntpRemaining >= 0 ? ntpRemaining % 60 : 0;
      const radarMins = Math.max(0, Math.floor(radarRemaining / 60));
      const radarSecs = radarRemaining >= 0 ? radarRemaining % 60 : 0;
      
      process.stdout.write('\r\x1B[K');
      process.stdout.write(`Next data update:  ${dataMins.toString().padStart(2, '0')}:${dataSecs.toString().padStart(2, '0')}\n`);
      process.stdout.write('\x1B[K');
      process.stdout.write(`Next time sync:    ${ntpMins.toString().padStart(2, '0')}:${ntpSecs.toString().padStart(2, '0')}\n`);
      process.stdout.write('\x1B[K');
      process.stdout.write(`Next radar update: ${radarMins.toString().padStart(2, '0')}:${radarSecs.toString().padStart(2, '0')}`);

      process.stdout.write('\x1B[2A');
      
      dataRemaining--;
      ntpRemaining--;
      radarRemaining--;

      if (dataRemaining < 0 || ntpRemaining < 0 || radarRemaining < 0) {
        clearInterval(interval);

        process.stdout.write('\r\x1B[K\n\x1B[K\n\x1B[K\r');
        resolve({
          dataRemaining: Math.max(0, dataRemaining),
          ntpRemaining: Math.max(0, ntpRemaining),
          radarRemaining: Math.max(0, radarRemaining)
        });
      }
    }, 1000);
  });
}

async function runLoop() {
  let ntpCountdown = NTP_MINUTE_INTERVAL * 60;
  let radarCountdown = RADAR_MINUTE_INTERVAL * 60;
  let dataCountdown = DATA_MINUTE_INTERVAL * 60;
  
  // Run all jobs once at startup
  console.log("Starting initial generation for all forecast products...");
  try {
    await aggregate();
  } catch (err) {
    console.error(`Error during aggregation:`, err);
  }
  await provisionIntelliStar("data");
  console.log("Data products generated and provisioned.");
  
  console.log("Starting initial NTP time synchronization...");
  await provisionIntelliStar("timesync");
  console.log("NTP time synchronization completed.");
  
  console.log("Starting initial radar data provisioning...");
  await provisionIntelliStar("radar");
  console.log("Radar data provisioning completed.");
  
  while (true) {
    console.log(`\nWaiting until next update...`);
    const remaining = await countdown(dataCountdown, ntpCountdown, radarCountdown);
    dataCountdown = remaining.dataRemaining;
    ntpCountdown = remaining.ntpRemaining;
    radarCountdown = remaining.radarRemaining;
    
    if (dataCountdown <= 0) {
      console.log("Starting generation for forecast products...");
      try {
        await aggregate();
      } catch (err) {
        console.error(`Error during aggregation:`, err);
      }

      await provisionIntelliStar("data");
      console.log("All products generated and provisioned.");
      dataCountdown = DATA_MINUTE_INTERVAL * 60;
    }
    
    if (ntpCountdown <= 0) {
      console.log("Starting NTP time synchronization...");
      await provisionIntelliStar("timesync");
      console.log("NTP time synchronization completed.");
      ntpCountdown = NTP_MINUTE_INTERVAL * 60;
    }
    
    if (radarCountdown <= 0) {
      console.log("Starting radar data provisioning...");
      await provisionIntelliStar("radar");
      console.log("Radar data provisioning completed.");
      radarCountdown = RADAR_MINUTE_INTERVAL * 60;
    }
  }
}

runLoop();