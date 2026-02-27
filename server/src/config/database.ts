import mongoose, { mongo } from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    let mongoUri: string;
    if(process.env.ENV === 'development') {
      console.log('🔧 Running in development mode - using local MongoDB');
      mongoUri = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/performance_testing';
    }else{
      console.log('🌐 Running in production mode - connecting to MongoDB Atlas');
      mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD || '';
      if (!mongoUri) {
        throw new Error('MONGODB_URI is not defined in environment variables');
      }
    }
    
    await mongoose.connect(mongoUri);
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB error:', error);
});
