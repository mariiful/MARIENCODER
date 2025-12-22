const wind_dir = {
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
}
/**
 * Convert V3 TWC Hourly Fcst + IStar LFRecord to IStar 1 CC
 * @param {Object} input - V3 API Hourly Fcst Data as Json
 * @returns {}
 */
export function generateHourly(input) {
    let data = `
import twccommon
import time
import twc.dsmarshal as dsm

#areaList = wxdata.getUGCInterestList('${input.location}', 'coopId')

twccommon.Log.info("MARI ENCODER - Hourly Forecast is being sent")
#if not areaList:
#    abortMsg()

Y, M, D, h, m, s, wd, jd, dst = time.localtime(time.time())
if h < 16:
    dOffset = 0
else:
    dOffset = 1
keyTime = time.mktime((Y, M, D + dOffset, 0, 0, 0, 0, 0, -1))
    `
    for (const num in input.dayOfWeek) {
        const hour = `
#for area in areaList:
forecastTime_${num}_${input.location} = ${Math.round(new Date(input.validTimeLocal[num]) / 1000)}
b_${num}_${input.location} = twc.Data()
b_${num}_${input.location}.minTemp = ${input.temperature[num]}
b_${num}_${input.location}.maxTemp = ${input.temperature[num]}
b_${num}_${input.location}.windSpeed = ${input.windSpeed[num]}
b_${num}_${input.location}.windDir = ${wind_dir[input.windDirectionCardinal[num]]}
b_${num}_${input.location}.temp = ${input.temperature[num]}
b_${num}_${input.location}.skyCondition = ${input.iconCodeExtend[num]}
b_${num}_${input.location}.pop = ${input.precipChance[num]}

key_${num}_${input.location} = ('${input.location}.' + str(int(forecastTime_${num}_${input.location})))
wxdata.setData(key_${num}_${input.location}, 'hourlyFcst', b_${num}_${input.location}, int(forecastTime_${num}_${input.location} + 3600))
twccommon.Log.info("MARI ENCODER - Hourly forecast data has been set")

`

data += hour
}
return data
};