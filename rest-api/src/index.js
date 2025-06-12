const uploadRoute = require('./routes/upload');
const userRoutes = require('./routes/user').default || require('./routes/user');
app.use('/api', uploadRoute);
app.use('/api', userRoutes); 