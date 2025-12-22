/**
 * Convert V3 TWC CC + V3 Location Info / IStar LFRecord to IStar CC
 * @param {Object} input - V3 API CC Data as Json
 * @returns {}
 */
export function generateBulletin(input) {
    return `
import time
import twccommon
areaList = wxdata.getBulletinInterestList('${input.areaId}')
if ('${input.officeCode}' == 'KWNS'):
    abortMsg()
if (not areaList):
    abortMsg()



twccommon.Log.info("SET BULLETIN FOR ${input.areaId}")
areaList = wxdata.getBulletinInterestList('${input.areaId}')
group = """"""
txt = """${input.texts[0].description.replace("\\n", "")}"""
for area in areaList:
    b = twc.Data()
    b.pil = '${input.productIdentifier}'
    b.pilExt = '001'
    b.issueTime = ${Math.round(new Date(input.effectiveTimeLocal) / 1000)}
#
    b.dispExpiration = ${input.expireTimeUTC}
    b.group = group
    b.text = txt
    exp = ${input.expireTimeUTC}
    wxdata.setBulletin(area, b, exp)
    `
};