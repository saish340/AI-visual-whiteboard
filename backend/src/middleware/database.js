import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whiteboard';
    
    const connection = await import('mongoose').then(m => 
      m.default.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        minPoolSize: 5
      })
    );

    console.log('✅ MongoDB connected successfully');
    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Exit process with failure code
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    const mongoose = await import('mongoose');
    await mongoose.default.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting MongoDB:', error.message);
  }
};
