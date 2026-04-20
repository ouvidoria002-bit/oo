const http = require('http');

http.get('http://localhost:3004/api/fast-positions', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const buses = JSON.parse(data);
            console.log('\n--- 🚌 RELATÓRIO DE FROTA E ROTAS (EM OPERAÇÃO) ---');
            
            const list = buses.map(b => ({
                'Carro': b.VehicleDescription,
                'Placa': b.LicensePlate || 'S/P',
                'Rota Atual': b.LineNumber || 'ROTA NÃO IDENTIFICADA',
                'Status': b.status || 'N/A'
            }));

            // Ordenar por rota para facilitar leitura
            list.sort((a, b) => a['Rota Atual'].localeCompare(b['Rota Atual']));

            console.table(list);
            
            const totalOnRoad = list.filter(b => b['Rota Atual'] !== 'ROTA NÃO IDENTIFICADA').length;
            console.log('\n📈 RESUMO OPERACIONAL:');
            console.log(`- Total de Ônibus: ${list.length}`);
            console.log(`- Em Rota Oficial: ${totalOnRoad}`);
            console.log(`- Fora de Rota/Garagem: ${list.length - totalOnRoad}`);
        } catch (e) {
            console.error('Erro ao processar dados:', e.message);
        }
    });
}).on('error', (e) => {
    console.error('Servidor offline:', e.message);
});
