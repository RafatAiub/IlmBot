require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');
const { Article, User } = require('../models');
const ragService = require('../services/ragService');

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // Ensure a system user exists to act as the author for seeded articles
    let systemUser = await User.findOne({ email: 'system@ilmbot.local' });
    if (!systemUser) {
      systemUser = new User({
        name: 'System Admin',
        email: 'system@ilmbot.local',
        password: 'auto_generated_seed_password', // Mongoose model requires password, hashing bypassed as it's not logging in
        role: 'admin'
      });
      await systemUser.save();
      console.log('Created system user for authorship.');
    }

    const filePath = path.join(__dirname, 'articles.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const articles = JSON.parse(fileData);

    console.log(`Found ${articles.length} articles to process.`);

    for (let i = 0; i < articles.length; i++) {
      const item = articles[i];
      console.log(`[${i + 1}/${articles.length}] Processing: "${item.title}"`);

      try {
        const textToEmbed = `${item.title}\n\n${item.content}`;
        const embedding = await ragService.embedText(textToEmbed);

        const newArticle = new Article({
          title: item.title,
          content: item.content,
          category: item.category,
          tags: item.tags || [],
          embedding: embedding,
          author: systemUser._id
        });

        await newArticle.save();
        console.log(`  -> Successfully saved and embedded.`);
      } catch (err) {
        console.error(`  -> Failed to process article "${item.title}":`, err.message);
      }
    }

    console.log('Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  }
}

seed();
