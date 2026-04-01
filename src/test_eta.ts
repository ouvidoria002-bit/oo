import { loadAllRoutes, rawRouteCache } from './routeMatcher';
import { calculateETA } from './etaManager';

const run = async () => {
  // We need to mock fetch for loadAllRoutes since it runs fetch in browser
  let fs = require('fs');
  global.fetch = async (url) => {
    // url is /cbt/kml-exports/filename.kml
    const filename = url.split('/').pop();
    const data = fs.readFileSync('../../CBTMonitoramento/kml-exports/' + filename, 'utf-8');
    return { ok: true, text: async () => data };
  };
  global.localStorage = { getItem: () => null, setItem: () => { } };

  await loadAllRoutes();
  console.log("Loaded KMLs");

  const busDC596 = {
    "VehicleDescription": "DC-596",
    "LineNumber": "DC-TZ03",
    "Latitude": -22.64181,
    "Longitude": -43.2981,
    "Speed": 25,
    "Direction": 123.23,
    "GPSDate": "2026-03-13T16:15:54.543Z"
  };

  const busDC597 = {
    "VehicleDescription": "DC-597",
    "LineNumber": "DC-TZ03",
    "Latitude": -22.62635,
    "Longitude": -43.30417,
    "Speed": 6,
    "Direction": 329.76,
    "GPSDate": "2026-03-13T16:15:48.703Z"
  };

  const mockStop = {
    id: "test",
    name: "USF Parque Eldorado",
    latitude: -22.684,
    longitude: -43.275
  };

  rawRouteCache['DC-TZ03'].forEach((p, i) => {
    if (i % 200 === 0) console.log("Point", i, p);
  });

  const eta596 = calculateETA(mockStop as any, "DC-TZ03", [busDC596]);
  console.log("ETA DC-596:", eta596);

  const eta597 = calculateETA(mockStop as any, "DC-TZ03", [busDC597]);
  console.log("ETA DC-597:", eta597);
};

run();
