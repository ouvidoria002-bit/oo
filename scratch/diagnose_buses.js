const axios = require('axios');

async function diagnose() {
    console.log('--- Iniciando Diagnóstico de Sinal (30 segundos) ---');
    const stats = {};
    const startTime = Date.now();
    const duration = 30000; // 30s

    let samples = 0;
    while (Date.now() - startTime < duration) {
        try {
            const response = await axios.get('http://localhost:3004/api/fast-positions');
            const buses = response.data;
            const now = Date.now();

            buses.forEach(bus => {
                const id = bus.VehicleDescription;
                const gpsTime = new Date(bus.GPSDate).getTime();
                const ageSeconds = (now - gpsTime) / 1000;

                if (!stats[id]) {
                    stats[id] = { updates: 0, totalAge: 0, minAge: Infinity, maxAge: -Infinity, line: bus.LineNumber };
                }

                stats[id].updates++;
                stats[id].totalAge += ageSeconds;
                if (ageSeconds < stats[id].minAge) stats[id].minAge = ageSeconds;
                if (ageSeconds > stats[id].maxAge) stats[id].maxAge = ageSeconds;
            });
            
            samples++;
            process.stdout.write(`Amostra ${samples} coletada...\r`);
        } catch (e) {
            console.error('Erro ao buscar dados:', e.message);
        }
        await new Promise(r => setTimeout(r, 3000)); // Espera 3s entre amostras
    }

    console.log('\n\n--- RANKING DE QUALIDADE DE SINAL ---');
    const ranking = Object.entries(stats)
        .map(([id, s]) => ({
            id,
            line: s.line,
            avgAge: (s.totalAge / s.updates).toFixed(1),
            minAge: s.minAge.toFixed(1),
            reliability: ((s.updates / samples) * 100).toFixed(0) + '%'
        }))
        .sort((a, b) => a.avgAge - b.avgAge);

    console.table(ranking.slice(0, 10)); // Top 10 melhores
    console.log('\n--- VEÍCULOS COM SINAL INSTÁVEL (Piores) ---');
    console.table(ranking.slice(-10).reverse());
}

diagnose();
