import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rektefe';

const tireStatusSchema = new mongoose.Schema({
  userId: String,
  status: String,
  lastCheck: String,
  issues: [String],
});

const TireStatus = mongoose.models.TireStatus || mongoose.model('TireStatus', tireStatusSchema);

async function insertDummyTireStatus(userId: string) {
  await mongoose.connect(MONGO_URI);
  const existing = await TireStatus.findOne({ userId });
  if (existing) {
    console.log('Zaten kayıt var:', existing);
    return;
  }
  const dummy = new TireStatus({
    userId,
    status: 'İyi',
    lastCheck: new Date().toISOString().slice(0, 10),
    issues: [],
  });
  await dummy.save();
  console.log('Dummy TireStatus eklendi:', dummy);
  await mongoose.disconnect();
}

// Buraya kendi userId'ni gir
insertDummyTireStatus('684d1d8614d6dfa52dabdf71'); 