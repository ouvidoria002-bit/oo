const { MongoClient } = require('mongodb');
require('dotenv').config();

async function listDBs() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const admin = client.db().admin();
        const dbs = await admin.listDatabases();
        console.log('Databases:');
        dbs.databases.forEach(db => console.log(` - ${db.name}`));
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

listDBs();
