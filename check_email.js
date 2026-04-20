const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

async function checkEmailInPosts() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  const dbName = process.env.DB_NAME || 'ColabOuvidoria';
  const collectionName = process.env.COLLECTION_NAME || 'posts';

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Search for the specific person
    const searchName = "Luciandro Pereira de lima";
    const searchEmail = "leone.marketin2024@gmail.com";
    const searchPhone = "21989200123";

    console.log(`\nSearching for "${searchName}"...`);
    const postsByName = await collection.find({
      $or: [
        { citizen: { $regex: searchName, $options: 'i' } },
        { description: { $regex: searchName, $options: 'i' } }
      ]
    }).toArray();

    if (postsByName.length > 0) {
      console.log(`✅ Found ${postsByName.length} posts matching the name.`);
      console.log('\nFull details of the first matching post:');
      console.log(JSON.stringify(postsByName[0], null, 2));
      // postsByName.forEach(p => console.log(`- ID: ${p.id}, Citizen: ${p.citizen}, Status: ${p.status}`));
    } else {
      console.log(`❌ No posts found matching the name "${searchName}".`);
    }

    console.log(`\nSearching for email "${searchEmail}"...`);
    // Search in all fields for the email
    const postsByEmail = await collection.find({
      $or: [
        { description: { $regex: searchEmail, $options: 'i' } },
        { citizen: { $regex: searchEmail, $options: 'i' } }
      ]
    }).toArray();

    if (postsByEmail.length > 0) {
      console.log(`✅ Found ${postsByEmail.length} posts matching the email.`);
    } else {
      console.log(`❌ No posts found matching the email.`);
    }

    console.log(`\nSearching for phone "${searchPhone}"...`);
    const postsByPhone = await collection.find({
      $or: [
        { description: { $regex: searchPhone, $options: 'i' } },
        { citizen: { $regex: searchPhone, $options: 'i' } }
      ]
    }).toArray();

    if (postsByPhone.length > 0) {
      console.log(`✅ Found ${postsByPhone.length} posts matching the phone.`);
    } else {
      console.log(`❌ No posts found matching the phone.`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

checkEmailInPosts();
