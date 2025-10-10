const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

mongoose.connect('mongodb://localhost:27017/rektefe', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  email: String,
  userType: String,
  serviceCategories: [String]
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function getToken() {
  try {
    const user = await User.findOne({ email: 'testust@gmail.com' });
    if (!user) {
      console.log('❌ testust@gmail.com bulunamadı');
      process.exit(1);
    }
    
    const token = jwt.sign(
      { 
        userId: user._id, 
        userType: user.userType,
        email: user.email 
      }, 
      process.env.JWT_SECRET || 'development-only-secret', 
      { expiresIn: '1h' }
    );
    
    console.log('Token:', token);
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

getToken();
