import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { BrandConfig, SystemControl } from '../models';

dotenv.config();

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-content-agent';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await BrandConfig.deleteMany({});
    await SystemControl.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create sample brand configuration
    const brand = await BrandConfig.create({
      name: 'TechFlow Innovations',
      industry: 'Technology / SaaS',
      voiceTone: ['professional', 'innovative', 'approachable', 'data-driven'],
      targetAudience: 'Software developers, tech leaders, and startup founders aged 25-45',
      keyMessages: [
        'Empowering developers with AI-powered tools',
        'Making complex technology accessible',
        'Innovation through automation',
        'Building the future of software development',
      ],
      doNotMention: [
        'Politics',
        'Controversial social topics',
        'Competitor names',
        'Unverified statistics',
      ],
    });

    console.log('✅ Created sample brand:', brand.name);

    // Create system control
    const systemControl = await SystemControl.create({
      mode: 'active',
      lastChangedBy: 'system',
      lastChangedAt: new Date(),
      settings: {
        autoPostingEnabled: true,
        requireApprovalForAll: true,
        maxDailyPosts: 5,
      },
    });

    console.log('✅ Created system control:', systemControl.mode);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Sample Brand Details:');
    console.log(`   Name: ${brand.name}`);
    console.log(`   Industry: ${brand.industry}`);
    console.log(`   ID: ${brand._id}`);
    console.log('\n💡 Use this Brand ID when generating content');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
