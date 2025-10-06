import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  // Test environment için MongoDB'yi devre dışı bırak
  if (process.env.NODE_ENV === 'test') {
    // Mevcut bağlantıyı kapat
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    
    mongo = await MongoMemoryServer.create();
    const mongoUri = mongo.getUri();
    await mongoose.connect(mongoUri);
  }
});

beforeEach(async () => {
  if (process.env.NODE_ENV === 'test') {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    if (mongo) {
      await mongo.stop();
    }
  }
});