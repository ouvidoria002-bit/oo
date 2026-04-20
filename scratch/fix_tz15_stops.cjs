const fs = require('fs');
const path = require('path');

const kmlPath = 'c:/Users/501379.PMDC/Desktop/PROJETOSOGM/tarifazazero/TZ-APP/public/kml-exports/DC_524.kml';
const outputPath = 'c:/Users/501379.PMDC/Desktop/PROJETOSOGM/tarifazazero/TZ-APP/public/stops/DC_TZ15.json';

try {
    const kmlContent = fs.readFileSync(kmlPath, 'utf8');
    const coordMatch = kmlContent.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    
    if (coordMatch) {
        const rawCoords = coordMatch[1].trim().split(/\s+/);
        const points = [];
        
        // Pegar pontos a cada 15 posições para não poluir muito, mas ter cobertura
        for (let i = 0; i < rawCoords.length; i += 15) {
            const [lng, lat] = rawCoords[i].split(',');
            if (lat && lng) {
                points.push({
                    "PointName": i === 0 ? "Terminal Pilar" : `Ponto ${points.length}`,
                    "Latitude": parseFloat(lat),
                    "Longitude": parseFloat(lng)
                });
            }
        }
        
        // Adicionar o último ponto como terminal
        const lastCoord = rawCoords[rawCoords.length - 1].split(',');
        points.push({
            "PointName": "Terminal Cidade dos Meninos",
            "Latitude": parseFloat(lastCoord[1]),
            "Longitude": parseFloat(lastCoord[0])
        });

        fs.writeFileSync(outputPath, JSON.stringify(points, null, 2));
        console.log(`Sucesso! Gerados ${points.length} pontos para DC-TZ15.`);
    } else {
        console.error("Coordenadas não encontradas no KML.");
    }
} catch (err) {
    console.error("Erro ao processar:", err.message);
}
