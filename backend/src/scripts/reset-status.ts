import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ContentQueue } from '../models';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const resetStatus = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/ai-content-agent';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const contentId = '6978f4ed38cbd47f01299c18';
    const result = await ContentQueue.findByIdAndUpdate(
      contentId,
      {
        $set: { status: 'pending' },
        $unset: { approvedBy: '', approvedAt: '' },
      },
      { new: true },
    );

    if (result) {
      console.log(
        `✅ Successfully updated status to pending for ${contentId}`,
      );
      console.log(`Platform: ${result.platform}`);
      console.log(`Current Status: ${result.status}`);
    } else {
      console.error(`❌ Content ${contentId} not found`);
    }
  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

resetStatus();
