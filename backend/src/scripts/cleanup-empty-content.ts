import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ContentQueue } from '../models';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const cleanup = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/ai-content-agent';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Updated Criteria:
    // 1. generationStatus is 'generating' (Stuck)
    // 2. content.text is empty
    const result = await ContentQueue.deleteMany({
      generationStatus: 'generating',
      'content.text': { $in: ['', null] },
    });

    console.log(
      `🗑️ Deleted ${result.deletedCount} empty content items.`,
    );
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

cleanup();
