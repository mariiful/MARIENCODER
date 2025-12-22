const axios = require("axios");

const API_KEY = "e1f10a1e78da46f5b10a1e78da96f525";

axios.get("https://api.weather.com/v3/wx/forecast/daily/7day", {
  params: {
    geocode: "40.71,-74.01",
    format: "json",
    units: "e",
    language: "en-US",
    apiKey: API_KEY
  }
}).then(r => {
  console.log("SUCCESS");
}).catch(e => {
  console.error(e.response?.status, e.response?.data);
});
