export function generateDaily(input) {
    const fcstValidLocal = input.validTimeLocal[0];
    const fcstDate = new Date(fcstValidLocal);
    const hour = fcstDate.getHours();
    let midnightLocal = new Date(fcstDate.getTime() - hour * 60 * 60 * 1000);
    if (hour > 5 && hour < 15) {
        midnightLocal = new Date(fcstDate.getTime() - 7 * 60 * 60 * 1000);
    } else {
        midnightLocal = new Date(fcstDate.getTime() - 19 * 60 * 60 * 1000);
    }
    let keyTime = Math.floor(midnightLocal.getTime() / 1000);

    console.log(new Date(keyTime * 1000).toLocaleString(), fcstDate.toLocaleString(), hour);
    
    // Logically determine 'rem' based on current time in the forecast timezone
    let rem = 1;

    // Get daypart data for icons (alternates day/night)
    const daypartIcons = input.daypart?.[0]?.iconCodeExtend || [];

    // Python code header
    let data = `
import twccommon
import time
import twc.dsmarshal as dsm

#areaList = wxdata.getUGCInterestList('${input.location}', 'coopId')

twccommon.Log.info("MARI ENCODER - Daily Forecast is being sent")

keyTime = ${keyTime}
print(keyTime)
`;

    // Iterate through the days (using dayOfWeek array length)
    const numDays = input.dayOfWeek?.length || 0;
    for (let i = 0; i < numDays; i++) {
        const num = i + 1;
        const maxTemp = input.temperatureMax?.[i];
        const minTemp = input.temperatureMin?.[i];
        // Daypart icons alternate: index 0=day1-day, 1=day1-night, 2=day2-day, 3=day2-night, etc.
        const dayIcon = daypartIcons[i * 2];
        const nightIcon = daypartIcons[i * 2 + 1];

        const s = Math.floor(Math.random() * 8) + 1;
        let bal = "MARI";
        if (s === 3) {
            bal = "RAI"
        }

        const day = `
#for area in areaList:
forecastTime_${num} = keyTime + (${num - rem} * 86400)
b_${num} = twc.Data()
${maxTemp != null ? `b_${num}.highTemp = ${maxTemp}` : ""}
b_${num}.lowTemp = ${minTemp ?? "None"}
${dayIcon != null ? `b_${num}.daySkyCondition = ${dayIcon}` : ""}
b_${num}.eveningSkyCondition = ${nightIcon ?? "None"}
wxdata.setData(('${input.location}.' + str(int(forecastTime_${num}))), 'dailyFcst', b_${num}, int(forecastTime_${num} + 86400))
twccommon.Log.info("${bal} ENCODER - Daily forecast data has been set")
print("${bal} ENCODER - Daily forecast data has been set")
`;
        data += day;
    }

    return data;
}