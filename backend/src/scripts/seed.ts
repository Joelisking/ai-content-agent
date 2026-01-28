import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  BrandConfig,
  SystemControl,
  User,
  ContentQueue,
  AuditLog,
  MediaUpload,
} from '../models';
import bcrypt from 'bcryptjs';

dotenv.config();

const seedData = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/ai-content-agent';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await BrandConfig.deleteMany({});
    await SystemControl.deleteMany({});
    await ContentQueue.deleteMany({});
    await AuditLog.deleteMany({});
    await MediaUpload.deleteMany({});
    console.log('🗑️  Cleared ALL existing data');

    // Create sample brand configuration
    const brand = await BrandConfig.create({
      name: 'TechFlow Innovations',
      industry: 'Technology / SaaS',
      voiceTone: [
        'professional',
        'innovative',
        'approachable',
        'data-driven',
      ],
      targetAudience:
        'Software developers, tech leaders, and startup founders aged 25-45',
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

    // Create Admin User
    const adminEmail = 'adujoel7@gmail.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Pass123$1', salt);

      await User.create({
        email: adminEmail,
        passwordHash,
        name: 'Joel Admin',
        role: 'admin',
      });
      console.log('✅ Created admin user:', adminEmail);
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
