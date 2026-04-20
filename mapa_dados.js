const { MongoClient } = require('mongodb');
require('dotenv').config();

async function mapData() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);
    const results = [];

    try {
        await client.connect();
        const admin = client.db().admin();
        const dbs = await admin.listDatabases();
        
        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'config', 'local'].includes(dbName)) continue;
            
            const db = client.db(dbName);
            const collections = await db.listCollections().toArray();
            
            for (const collInfo of collections) {
                const count = await db.collection(collInfo.name).countDocuments();
                results.push({ db: dbName, coll: collInfo.name, count });
            }
        }
        
        console.table(results);
        
        // Busca exaustiva por Eliza ou Elisa Rodrigues
        for (const res of results) {
            if (res.count === 0) continue;
            const collection = client.db(res.db).collection(res.coll);
            const match = await collection.findOne({
                $or: [
                    { description: /eli[sz]a.*rodrigues/i },
                    { citizen: /eli[sz]a.*rodrigues/i },
                    { "citizen.name": /eli[sz]a.*rodrigues/i },
                    { body: /eli[sz]a.*rodrigues/i },
                    { text: /eli[sz]a.*rodrigues/i },
                    { assunto: /eli[sz]a.*rodrigues/i },
                    { comments: /eli[sz]a.*rodrigues/i }
                ]
            });
            
            if (match) {
                console.log(`\n✅ ENCONTRADO EM ${res.db}.${res.coll}:`);
                console.log(JSON.stringify(match, null, 2));
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

mapData();
