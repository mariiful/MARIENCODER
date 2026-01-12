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

    let rem = 1;

    const daypartIcons = input.daypart?.[0]?.iconCodeExtend || [];

    let data = `
import twccommon
import time
import twc.dsmarshal as dsm

areaList = wxdata.getUGCInterestList('${input.location}', 'coopId')

twccommon.Log.info("MARI ENCODER - Daily Forecast is being sent")

keyTime = ${keyTime}
`;

    const numDays = input.dayOfWeek?.length || 0;
    for (let i = 0; i < numDays; i++) {
        const num = i + 1;
        const maxTemp = input.temperatureMax?.[i];
        const minTemp = input.temperatureMin?.[i];

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