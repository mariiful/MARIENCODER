export function generateCurrent(input) {
    let header = `import twccommon
    
areaList = wxdata.getUGCInterestList('CCC999', 'county')
    
twccommon.Log.info("MARI ENCODER - Current Conditions is being sent")

if not areaList:
    abortMsg()
    `

let data = `
for area in areaList:
    b = twc.Data()
    b.skyCondition = ${input.iconCode}
    b.temp = ${input.temperature}
    b.humidity = ${input.relativeHumidity}
    b.feelsLike = ${input.temperatureFeelsLike}
    b.dewpoint = ${input.temperatureDewPoint}
    b.altimeter = ${input.pressureAltimeter}
    b.visibility = ${input.visibility}
    b.windDirection = ${input.windDirection}
    b.windSpeed = ${input.windSpeed}
    b.gusts = ${input.windGust || 'None'}
    b.windChill = ${input.temperatureWindChill || 'None'}
    b.pressureTendency = 2
    
    #wxdata.setDailyRec(area, b, ${input.validTimeUtc})
    wxdata.setData('T71866000', 'obs', b, ${input.expirationTimeUtc})
    twccommon.Log.info("MARI ENCODER - Current Conditions data set for " + area)
    `;
    return header + data;
}