/**
 * Convert V3 TWC CC + V3 Location Info / IStar LFRecord to IStar CC
 * @param {Object} input - V3 API CC Data as Json
 * @returns {}
 */
export function generateHeadline(input) {
    return `
import time
import twccommon
areaList = wxdata.getUGCInterestList('${input.areaId}', 'zone')
if ('${input.officeCode}' == 'KWNS'):
    abortMsg()
if (not areaList):
    abortMsg()



twccommon.Log.info("SET HEADLINE FOR ${input.areaId}")
areaList = wxdata.getUGCInterestList('${input.areaId}', 'zone')
headline = "${input.headlineText}"
phenSig = "${input.phenomena}_${input.significance}"

twccommon.Log.info("%s, %s, %s" % (areaList, phenSig, headline))
hdlnExp = ${input.endTimeUTC}
for area in areaList:
    d = twc.Data()
    d.headline = headline
    d.phenSig = phenSig
    d.expiration = hdlnExp
    wxdata.setHeadline(area, d, hdlnExp)
    `
};