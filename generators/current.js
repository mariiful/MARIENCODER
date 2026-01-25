const windMapping = {
    'Calm': 0,
    'N': 1,
    'NNE': 2,
    'NE': 3,
    'ENE': 4,
    'E': 5,
    'ESE': 6,
    'SE': 7,
    'SSE': 8,
    'S': 9,
    'SSW': 10,
    'SW': 11,
    'WSW': 12,
    'W': 13,
    'WNW': 14,
    'NW': 15,
    'NNW': 16,
    'Var': 17
};


export function generateCurrent(input) {
    const expiration = input.validTimeUtc + 3600; // 1 hour from observation time
    
    let header = `import twccommon

twccommon.Log.info("MARI ENCODER - Current Conditions is being sent for ${input.location}")
areaList = wxdata.getUGCInterestList('${input.county}', 'county')
`

let data = `
d = twc.Data()
d.skyCondition = ${input.iconCodeExtend}
d.temp = ${input.temperature}
d.humidity = ${input.relativeHumidity}
d.feelsLikeIndex = ${input.temperatureFeelsLike}
d.heatIndex = ${input.temperatureHeatIndex || 'None'}
d.uvIndex = ${input.uvIndex}
d.dewpoint = ${input.temperatureDewPoint}
d.altimeter = ${input.pressureAltimeter}
d.visibility = ${input.visibility}
d.windDirection = ${windMapping[input.windDirectionCardinal] || 0}
d.windSpeed = ${input.windSpeed}
d.gusts = ${input.windGust || 'None'}
d.windChill = ${input.temperatureWindChill || 'None'}
d.pressure = ${input.pressureMeanSeaLevel}
d.pressureTendency = 2

wxdata.setData('${input.location}', 'obs', d, ${expiration})
twccommon.Log.info("MARI ENCODER - Current Conditions data set for ${input.location}")
`;
    return header + data;
}