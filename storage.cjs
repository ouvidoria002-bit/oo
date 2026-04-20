const fs = require('fs-extra');
const path = require('path');

const TRAJ_DIR = path.join(__dirname, 'data', 'trajectories');
const KML_DIR = path.join(TRAJ_DIR, 'kmls');

async function ensureStoragePaths() {
    await fs.ensureDir(TRAJ_DIR);
    await fs.ensureDir(KML_DIR);
}

async function saveTrajectory(vehicleId, points) {
    if (!points || points.length === 0) return;
    
    try {
        // Save JSON
        const jsonPath = path.join(TRAJ_DIR, `${vehicleId}.json`);
        await fs.writeJson(jsonPath, points);
        
        // Generate KML
        await generateKML(vehicleId, points);
    } catch (err) {
        console.error(`[Storage] Failed to save ${vehicleId}:`, err);
        throw err;
    }
}

async function generateKML(vehicleId, points) {
    const kmlPath = path.join(KML_DIR, `${vehicleId}.kml`);
    const coordString = points
        .map(p => `${p.Longitude},${p.Latitude},0`)
        .join(' ');

    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Track - ${vehicleId}</name>
    <Style id="busLine">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>Trajeto ${vehicleId}</name>
      <styleUrl>#busLine</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordString}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

    await fs.writeFile(kmlPath, kmlContent);
}

module.exports = {
    ensureStoragePaths,
    saveTrajectory
};
