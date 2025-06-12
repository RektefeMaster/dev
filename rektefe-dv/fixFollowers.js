const mongoose = require('mongoose');

// Doğru bağlantı URI'sı:
const uri = 'mongodb+srv://rektefekadnur09:rektefekadnur09@cluster0.agf6m9t.mongodb.net/rektefe?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(uri).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

  await User.updateMany(
    { followers: { $not: { $type: 'array' } } },
    { $set: { followers: [] } }
  );
  await User.updateMany(
    { following: { $not: { $type: 'array' } } },
    { $set: { following: [] } }
  );
  console.log('Tüm kullanıcılar düzeltildi!');
  process.exit();
}).catch(err => {
  console.error('MongoDB bağlantı hatası:', err);
  process.exit(1);
});