const http = require('http');

http.get('http://localhost:3004/api/fast-positions', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const buses = JSON.parse(data);
        const now = Date.now();
        
        const rank = buses.map(b => {
            const age = (now - new Date(b.GPSDate).getTime()) / 1000;
            return {
                ID: b.VehicleDescription.replace('DC', ''),
                Linha: b.LineNumber,
                'Idade Sinal': age.toFixed(1) + 's',
                Velocidade: b.Speed + ' km/h',
                Status: b.status,
                ageNum: age
            };
        }).sort((a, b) => a.ageNum - b.ageNum);

        console.log('\n--- MELHORES SINAIS AGORA ---');
        console.table(rank.slice(0, 10).map(({ageNum, ...rest}) => rest));
        
        console.log('\n--- PIORES SINAIS AGORA ---');
        console.table(rank.slice(-10).reverse().map(({ageNum, ...rest}) => rest));
    });
});
