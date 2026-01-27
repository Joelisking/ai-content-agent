import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ContentQueue, MediaUpload, BrandConfig } from '../models';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const imagesToRecover = [
  {
    platform: 'linkedin',
    brandName: 'TechFlow Innovations',
    url: 'https://res.cloudinary.com/dxfqrxjde/image/upload/v1769534814/ai-content-agent/generated/ai-generated-526d8e59-9d87-40cc-8eeb-9621537e1f29.png',
  },
  {
    platform: 'instagram',
    brandName: 'TechFlow Innovations',
    url: 'https://res.cloudinary.com/dxfqrxjde/image/upload/v1769534752/ai-content-agent/generated/ai-generated-0bb3de32-4ddc-4d13-8a7f-31e72f20fbdd.png',
  },
];

const recover = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/ai-content-agent';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    for (const item of imagesToRecover) {
      console.log(
        `\n🔍 Looking for ${item.platform} content for ${item.brandName}...`,
      );

      // Find the brand first
      const brand = await BrandConfig.findOne({
        name: item.brandName,
      });
      if (!brand) {
        console.error(`❌ Brand '${item.brandName}' not found.`);
        continue;
      }

      // Find the most recent content for this brand and platform that has NO media attached
      // and was likely created recently (e.g. last 24 hours just to be safe, but sort desc is usually enough)
      const content = await ContentQueue.findOne({
        brandConfigId: brand._id,
        platform: item.platform,
        'content.mediaIds': { $size: 0 }, // No media attached
      }).sort({ createdAt: -1 });

      if (!content) {
        console.warn(
          `⚠️ No candidate content found for ${item.platform} (maybe already fixed?)`,
        );
        continue;
      }

      console.log(
        `✅ Found target content: ${content._id} (Created: ${content.createdAt})`,
      );

      // Create MediaUpload
      console.log('💾 Creating MediaUpload...');
      const media = new MediaUpload({
        filename: `recovered-${Date.now()}`,
        originalName: 'Recovered AI Image',
        mimetype: 'image/png',
        size: 0,
        path: item.url,
        metadata: {
          aiGenerated: true,
          recovered: true,
        },
      });
      await media.save();

      // Update Content
      console.log('🔗 Attaching to Content...');
      content.content.mediaIds.push(media._id as any);

      if (!content.metadata) content.metadata = {} as any;
      (content.metadata as any).generatedImageId =
        media._id.toString();
      (content.metadata as any).generatedImageUrl = item.url;

      await content.save();
      console.log('🎉 Successfully recovered image for content!');
    }
  } catch (error) {
    console.error('❌ Recovery failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

recover();
