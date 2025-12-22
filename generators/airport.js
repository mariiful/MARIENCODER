import axios from "axios";

const wind_dir = {
    'Calm': 0, 'N': 1, 'NNE': 2, 'NE': 3, 'ENE': 4,
    'E': 5, 'ESE': 6, 'SE': 7, 'SSE': 8, 'S': 9,
    'SSW': 10, 'SW': 11, 'WSW': 12, 'W': 13, 'WNW': 14,
    'NW': 15, 'NNW': 16, 'Var': 17
};

// Generates the Python code from fetched data
function generateAirportConditions(input) {
    const reasons = input?.reasons ?? [];
    const airport = input.airport;

    let py = `
import twccommon

b = twc.Data()
`;

    reasons.forEach(r => {
        let delayType = "none";
        let trend = 0;

        if (r.reason.includes("departure")) delayType = "departure";
        if (r.reason.includes("arrival") || r.reason.includes("inbound")) delayType = "arrival";
        if (r.reason.includes("decreasing")) trend = 2;
        if (r.reason.includes("increasing")) trend = 1;

        py += `
b.${delayType}Delay = ${Math.round(r.delay_secs / 60)}
b.${delayType}DelayReason = '${r.category.charAt(0).toUpperCase() + r.category.slice(1)}'
b.${delayType}DelayTrend = ${trend}
wxdata.setData('${airport}', 'airportDelays', b, ${Math.floor(Date.now() / 1000) + 3600})
`;
    });

    if (input.weather) {
        py += `
b.temp = ${input.weather.temp_c ?? "None"}
b.skyCondition = ${input.weather.skyCondition ?? "None"}
b.windSpeed = ${input.weather.windSpeedKts ?? 0}
b.windDir = ${wind_dir[input.weather.windDir] ?? 0}
b.visibility = ${input.weather.visibilityKm ?? "None"}
`;
    }

    return py;
}

// Fetches data from AeroAPI
async function fetchFromAeroAPI(airportCode, apiKey) {
    try {
        const res = await axios.get(`https://aeroapi.flightaware.com/aeroapi/airports/${airportCode}`, {
            headers: { 'x-apikey': apiKey }
        });

        const data = res.data;
        return {
            airport: airportCode,
            weather: data.weather ? {
                temp_c: data.weather.temperature?.value,
                skyCondition: data.weather.weather_condition?.code,
                windSpeedKts: data.weather.wind_speed?.value,
                windDir: data.weather.wind_direction?.value,
                visibilityKm: data.weather.visibility?.value
            } : null,
            reasons: data.delays?.map(d => ({
                delay_secs: d.delay_seconds,
                reason: d.reason,
                category: d.category
            })) ?? []
        };
    } catch (err) {
        console.error("Failed to fetch AeroAPI data:", err.response?.data || err);
        return { airport: airportCode, reasons: [] };
    }
}

export {
    generateAirportConditions,
    fetchFromAeroAPI
};
