/**
 * Convert TWC V3 Daypart Forecast response to IStar 1 CC Python script
 * @param {Object} input - TWC API Daypart Forecast JSON response
 * @returns {string} Python code string to be written and executed
 */

export function generateDaypart(input) {
    const dayparts = input.daypart?.[0]?.daypartName || [];
    const phrases = input.daypart?.[0]?.narrative || [];
    const icons = input.daypart?.[0]?.iconCodeExtend || [];
    const temps = input.daypart?.[0]?.temperature || [];
    const location = input.location
    const county = input.county
    const numDayparts = 4;

    let output = `
import twccommon
import time
import twc.dsmarshal as dsm

areaList = wxdata.getUGCInterestList('${location}', 'coopId')
#twccommon.Log.info(areaList)

twccommon.Log.info("MARI ENCODER - Daypart forecast is being sent.")
#if not areaList:
#    abortMsg()

Y, M, D, h, m, s, wd, jd, dst = time.localtime(time.time())
dOffset = 0  # Always use offset of 0

keyTime = time.mktime((Y, M, D + dOffset, 5, 0, 0, 0, 0, -1))

numDayparts = ${numDayparts}

times = [
    keyTime,
    keyTime + (12 * 3600),
    keyTime + (24 * 3600),
    keyTime + (36 * 3600)
]

`;

    let daypartCounter = 1;
    let period = 1;

    for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];
        if (!phrase) continue;

        const dpName = dayparts[i]?.toLowerCase() || '';
        const icon = icons[i] ?? 3200;
        const temp = temps[i] ?? 70;
        const daypart_name = dayparts[i] ?? "None";

        const varName = `${daypartCounter}_${period}`;
        const validTime = `int(keyTime + (${i} * 12 * 3600))`;
        const expiration = `int(${validTime} + 43200)`;

        output += `
forecastTime_${varName} = ${validTime}
b_${varName} = twc.Data()

b_${varName}.phrase = '${phrase.replace(/'/g, "\\'")}'
b_${varName}.skyCondition = ${icon}
b_${varName}.temp = ${temp}
b_${varName}.daypartName = "${daypart_name}"

wxdata.setDaypartData(
    loc='${location}',
    type='textFcst',
    data=b_${varName},
    validTime=forecastTime_${varName},
    numDayparts=${numDayparts},
    expiration=${expiration}
)
twccommon.Log.info("MARI ENCODER - Daypart forecast set for ${location} at " + str(forecastTime_${varName}))
`;

        // Alternate between 1 (day) and 2 (night)
        if (period === 2) {
            daypartCounter++;
            if (daypartCounter > 8) break; // Limit to 8 dayparts (max 8_2)
            period = 1;
        } else {
            period = 2;
        }
    }

    return output;
};
