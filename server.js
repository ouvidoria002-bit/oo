const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const PDFDocument = require('pdfkit-table');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'ColabOuvidoria';
const collectionName = process.env.COLLECTION_NAME || 'posts';

let client;
async function getCollection() {
    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
    }
    return client.db(dbName).collection(collectionName);
}

// API de Pesquisa
app.get('/api/search', async (req, res) => {
    try {
        const { citizen, id, status, neighborhood } = req.query;
        const query = { dominio: 'zeladoria' };

        if (citizen) query.citizen = { $regex: citizen, $options: 'i' };
        if (id) query.id = parseInt(id);
        if (status) query.status = status;
        if (neighborhood) query.neighborhood = { $regex: neighborhood, $options: 'i' };

        const collection = await getCollection();
        const posts = await collection.find(query).sort({ created_at: -1 }).limit(100).toArray();
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API de Relatório PDF
app.post('/api/report', async (req, res) => {
    try {
        const { citizen, citizenInfo, posts } = req.body;
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Relatorio_Zeladoria_${citizen.replace(/\s/g, '_')}.pdf`);
        doc.pipe(res);

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
        doc.text(`Nome: ${citizen}`, 45, citizenBoxY + 10);
        doc.text(`Nascimento: ${citizenInfo?.nascimento || 'N/A'}`, 45, citizenBoxY + 25);
        doc.text(`Celular: ${citizenInfo?.celular || 'N/A'}`, 45, citizenBoxY + 40);
        doc.text(`Email: ${citizenInfo?.email || 'N/A'}`, 45, citizenBoxY + 55);
        
        doc.moveDown(3);

        // --- TABELA ---
        const tableData = {
            title: `Listagem de Manifestações (${posts.length} registros)`,
            headers: ["ID", "Data", "Tema", "Endereço", "Status"],
            rows: posts.map(p => [
                p.id.toString(),
                new Date(p.created_at).toLocaleDateString('pt-BR'),
                p.tema_especifico || 'Zeladoria',
                p.address ? (p.address.length > 25 ? p.address.substring(0, 22) + '...' : p.address) : 'N/A',
                p.status
            ]),
        };

        await doc.table(tableData, { 
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
            prepareRow: (row, i) => doc.font("Helvetica").fontSize(9),
            columnSpacing: 5,
            width: 535,
        });

        doc.end();
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
