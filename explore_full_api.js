require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const HEADERS = {
    'x-colab-application-id': process.env.COLAB_APP_ID,
    'x-colab-rest-api-key': process.env.COLAB_API_KEY,
    'x-colab-admin-user-auth-ticket': process.env.COLAB_AUTH_TICKET
};

const BASE = 'https://api.colabapp.com/v2/integration';

async function get(url) {
    try {
        const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        return res.data;
    } catch (err) {
        console.error(`❌ Erro em ${url}:`, err.response?.status, err.response?.data || err.message);
        return null;
    }
}

async function main() {
    console.log('🔍 Explorando API Colab - Relatório Completo\n');
    const resultado = {};

    // 1. Categorias
    console.log('📂 Buscando CATEGORIAS...');
    const categorias = await get(`${BASE}/categories`);
    resultado.categorias = categorias;
    if (categorias) {
        console.log(`   ✅ ${Array.isArray(categorias) ? categorias.length : 'objeto'} categoria(s) retornada(s)`);
        console.log('   Amostra:', JSON.stringify(Array.isArray(categorias) ? categorias.slice(0, 3) : categorias, null, 2).substring(0, 800));
    }

    // 2. Branches (Secretarias)
    console.log('\n🏛️  Buscando BRANCHES/SECRETARIAS...');
    const branches = await get(`${BASE}/branches`);
    resultado.branches = branches;
    if (branches) {
        console.log(`   ✅ ${Array.isArray(branches) ? branches.length : 'objeto'} branch(es) retornada(s)`);
        console.log('   Conteúdo completo:\n', JSON.stringify(branches, null, 2));
    }

    // 3. Posts com amostra
    console.log('\n📋 Buscando POSTS (amostra recente)...');
    const posts = await get(`${BASE}/posts?start_date=2026-04-01 00:00:00.0000&end_date=2026-04-07 23:59:59.0000`);
    resultado.posts_amostra = posts;
    if (posts && Array.isArray(posts)) {
        console.log(`   ✅ ${posts.length} post(s) retornado(s)`);
        console.log('   Campos disponíveis:', posts.length > 0 ? Object.keys(posts[0]).join(', ') : 'N/A');
        
        // Extraia branches únicos dos posts
        const branchesDePost = {};
        posts.forEach(p => {
            if (p.branch?.id) {
                branchesDePost[p.branch.id] = p.branch.name;
            }
        });
        console.log('\n   🏛️  Branches encontrados nos posts:');
        Object.entries(branchesDePost).forEach(([id, nome]) => {
            console.log(`      ID ${id}: ${nome}`);
        });

        // Categorias encontradas
        const catsDePost = {};
        posts.forEach(p => {
            if (p.category_id) {
                catsDePost[p.category_id] = (catsDePost[p.category_id] || 0) + 1;
            }
        });
        console.log('\n   🏷️  Categorias encontradas nos posts (id: contagem):');
        Object.entries(catsDePost).sort((a,b) => b[1]-a[1]).forEach(([id, c]) => {
            console.log(`      category_id ${id}: ${c} ocorrência(s)`);
        });
    }

    // Salva o resultado em arquivo
    fs.writeFileSync('./api_full_report.json', JSON.stringify(resultado, null, 2));
    console.log('\n✅ Relatório completo salvo em api_full_report.json');
}

main().catch(console.error);
