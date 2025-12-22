import stations from './stations.json' with { type: 'json' };

const stationMap = new Map(
  stations.map(s => [
    String(s.coopId),
    {
      city: s.cityNm,
      state: s.stCd,
      lat: s.lat,
      lon: s.long
    }
  ])
);

export function lookupByTecci(coopid) {
  const row = stationMap.get(String(coopid));
  if (!row) {
    throw new Error(`TECCI/COOP ID ${coopid} not found`);
  }
  return row;
}