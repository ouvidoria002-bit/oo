const http = require('http');

http.get('http://localhost:3004/api/fast-positions', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const buses = JSON.parse(data);
            console.log('--- Diagnóstico de Integridade do TZ-APP ---');
            console.log('Total de ônibus no cache do Servidor: ' + buses.length);
            
            const ids = buses.map(b => b.VehicleDescription).sort();
            console.log('IDs presentes no sistema:');
            console.log(JSON.stringify(ids, null, 2));

            if (buses.length >= 31) {
                console.log('\n✅ SUCESSO: O sistema está processando a frota completa (31-32 veículos).');
            } else {
                console.log('\n⚠️ ALERTA: O sistema tem menos veículos que a API bruta. Verifique filtros de teletransporte.');
            }
        } catch (e) {
            console.error('Erro ao ler a API local:', e.message);
        }
    });
}).on('error', (e) => {
    console.error('Servidor offline:', e.message);
});
