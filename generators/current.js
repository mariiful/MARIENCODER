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
b = twc.Data()
b.skyCondition = ${input.iconCodeExtend}
b.temp = ${input.temperature}
b.humidity = ${input.relativeHumidity}
b.feelsLike = ${input.temperatureFeelsLike}
b.dewpoint = ${input.temperatureDewPoint}
b.altimeter = ${input.pressureAltimeter}
b.visibility = ${input.visibility}
b.windDirection = ${windMapping[input.windDirectionCardinal] || 0}
b.windSpeed = ${input.windSpeed}
b.gusts = ${input.windGust || 'None'}
b.windChill = ${input.temperatureWindChill || 'None'}
b.pressureTendency = 2

wxdata.setData('${input.location}', 'obs', b, ${expiration})
twccommon.Log.info("MARI ENCODER - Current Conditions data set for ${input.location}")
`;
    return header + data;
}