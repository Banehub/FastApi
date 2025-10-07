// Script to fix weight entry indexes
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://williefbeukes:dAZlNQUZCBcKBi58@cluster0.ra02y7n.mongodb.net/fastapi';

async function fixIndexes() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('weight_entries');

    console.log('🗑️ Dropping existing indexes...');
    try {
      await collection.dropIndexes();
      console.log('✅ All indexes dropped');
    } catch (error) {
      console.log('ℹ️ No indexes to drop or error:', error.message);
    }

    console.log('📊 Creating new indexes...');
    
    // Create new indexes without unique constraint
    await collection.createIndex({ user_id: 1, date: -1 });
    console.log('✅ Created index: user_id + date');
    
    await collection.createIndex({ user_id: 1, created_at: -1 });
    console.log('✅ Created index: user_id + created_at');

    console.log('📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log('  -', JSON.stringify(index.key), index.unique ? '(unique)' : '');
    });

    console.log('\n🎉 Index fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixIndexes();
