const http = require('http');

console.log('--- Iniciando Análise de Sinal (60 segundos) ---');
console.log('Coletando amostras a cada 5 segundos...');

const stats = {}; // vehicleId -> { updates: 0, totalAge: 0, samples: 0 }
let sampleCount = 0;
const MAX_SAMPLES = 12; // 12 * 5s = 60s

const interval = setInterval(() => {
    http.get('http://localhost:3004/api/fast-positions', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const buses = JSON.parse(data);
                const now = Date.now();
                
                buses.forEach(bus => {
                    const id = bus.VehicleDescription;
                    if (!stats[id]) stats[id] = { updates: 0, totalAge: 0, samples: 0, lastDate: null };
                    
                    const gpsTime = new Date(bus.GPSDate).getTime();
                    const age = (now - gpsTime) / 1000; // segundos
                    
                    stats[id].samples++;
                    stats[id].totalAge += age;
                    
                    if (bus.GPSDate !== stats[id].lastDate) {
                        stats[id].updates++;
                        stats[id].lastDate = bus.GPSDate;
                    }
                });
                
                sampleCount++;
                process.stdout.write('.'); // Progresso
                
                if (sampleCount >= MAX_SAMPLES) {
                    clearInterval(interval);
                    printRanking();
                }
            } catch (e) {}
        });
    }).on('error', () => {});
}, 5000);

function printRanking() {
    console.log('\n\n--- 🏆 RANKING DE QUALIDADE DE SINAL (1 MINUTO) ---');
    
    const ranking = Object.keys(stats).map(id => {
        const s = stats[id];
        return {
            Veiculo: id,
            'Sinal Médio (s)': Math.round(s.totalAge / s.samples),
            'Atualizações': s.updates,
            'Pontuação': (s.updates * 10) - (s.totalAge / s.samples) // Fórmula simples de qualidade
        };
    });

    // Ordena pelo "Pontuação" (mais atualizações e menor idade = melhor)
    ranking.sort((a, b) => b.Pontuação - a.Pontuação);

    console.table(ranking.slice(0, 10));
    
    console.log('\n💡 OS CAMPEÕES:');
    console.log(`1º lugar: ${ranking[0].Veiculo} - Sinal extremamente estável.`);
    console.log(`2º lugar: ${ranking[1].Veiculo}`);
    console.log(`3º lugar: ${ranking[2].Veiculo}`);
    
    console.log('\n⚠️ CASOS CRÍTICOS (Pior sinal):');
    const worst = ranking.reverse().slice(0, 3);
    worst.forEach(w => console.log(`- ${w.Veiculo}: Sinal com atraso médio de ${w['Sinal Médio (s)']}s`));
}
