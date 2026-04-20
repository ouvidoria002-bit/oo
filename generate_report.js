const { MongoClient } = require('mongodb');
const PDFDocument = require('pdfkit-table');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function generateReport() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const dbName = process.env.DB_NAME || 'ColabOuvidoria';
    const collectionName = process.env.COLLECTION_NAME || 'posts';

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Busca dados do cidadão
        const citizenName = "Luciandro Pereira de Lima";
        const posts = await collection.find({
            citizen: { $regex: new RegExp(citizenName, "i") },
            dominio: "zeladoria"
        }).sort({ created_at: -1 }).toArray();

        // Cria o documento PDF
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const filePath = path.join(__dirname, 'Relatorio_Zeladoria_Luciandro_Lima.pdf');
        doc.pipe(fs.createWriteStream(filePath));

        // --- CABEÇALHO ---
        doc.fillColor('#1a5a3a').fontSize(22).text('Eladoria API - Relatório de Zeladoria', { align: 'center' });
        doc.moveDown(0.5);
        doc.fillColor('#444').fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
        doc.rect(30, 75, 535, 1).fill('#1a5a3a');
        doc.moveDown(1.5);

        // --- DADOS DO CIDADÃO ---
        doc.fillColor('#1a5a3a').fontSize(14).text('Dados do Munícipe', { underline: true });
        doc.moveDown(0.5);
        
        const citizenBoxY = doc.y;
        doc.rect(30, citizenBoxY, 535, 80).fillOpacity(0.05).fill('#eee');
        
        doc.fillOpacity(1).fillColor('#000').fontSize(11);
        doc.text(`Nome: ${citizenName}`, 45, citizenBoxY + 10);
        doc.text(`Nascimento: 27/12/1985`, 45, citizenBoxY + 25);
        doc.text(`Celular: +5521989200123`, 45, citizenBoxY + 40);
        doc.text(`Email: leone.marketin2024@gmail.com`, 45, citizenBoxY + 55);
        
        doc.moveDown(3);

        // --- RESUMO ---
        const statusCounts = posts.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {});

        doc.fillColor('#1a5a3a').fontSize(14).text('Resumo das Manifestações', { underline: true });
        doc.moveDown(0.5);
        doc.fillColor('#000').fontSize(11).text(`Total de registros encontrados: ${posts.length}`);
        
        const summaryText = Object.entries(statusCounts)
            .map(([status, count]) => `${status}: ${count}`)
            .join(' | ');
        doc.fontSize(10).text(`Distribuição por Status: ${summaryText}`);
        doc.moveDown(2);

        // --- TABELA ---
        const tableData = {
            title: "Listagem Detalhada de Manifestações",
            headers: ["ID", "Data", "Endereço", "Assunto", "Status"],
            rows: posts.map(p => [
                p.id.toString(),
                new Date(p.created_at).toLocaleDateString('pt-BR'),
                p.address ? (p.address.length > 30 ? p.address.substring(0, 27) + '...' : p.address) : 'N/A',
                p.assunto ? (p.assunto.length > 40 ? p.assunto.substring(0, 37) + '...' : p.assunto) : 'N/A',
                p.status
            ]),
        };

        await doc.table(tableData, { 
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
            prepareRow: (row, i) => doc.font("Helvetica").fontSize(9),
            columnSpacing: 5,
            width: 535,
        });

        // Finaliza o PDF
        doc.end();
        console.log(`Relatório gerado com sucesso: ${filePath}`);

    } catch (err) {
        console.error('Erro ao gerar relatório:', err);
    } finally {
        await client.close();
    }
}

generateReport();
