#!/usr/bin/env node

/**
 * Smart Library Platform - MongoDB Setup Script
 * This script sets up MongoDB collections and sample data
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_library_analytics';

class MongoSetup {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async runSetup() {
        console.log('🍃 Starting MongoDB Setup...\n');
        
        try {
            await this.connectToMongoDB();
            await this.createCollections();
            await this.insertSampleData();
            await this.createIndexes();
            await this.displayResults();
            
            console.log('\n✅ MongoDB setup completed successfully!');
        } catch (error) {
            console.error('\n❌ MongoDB setup failed:', error.message);
            process.exit(1);
        } finally {
            if (this.client) {
                await this.client.close();
            }
        }
    }

    async connectToMongoDB() {
        console.log('🔌 Connecting to MongoDB...');
        
        try {
            this.client = new MongoClient(MONGODB_URI);
            await this.client.connect();
            this.db = this.client.db('smart_library_analytics');
            console.log('✅ Connected to MongoDB successfully');
        } catch (error) {
            throw new Error(`Failed to connect to MongoDB: ${error.message}`);
        }
    }

    async createCollections() {
        console.log('\n📚 Creating collections...');
        
        try {
            // Create reading_sessions collection
            await this.db.createCollection('reading_sessions');
            console.log('✅ Created reading_sessions collection');
            
            // Create analytics_cache collection
            await this.db.createCollection('analytics_cache');
            console.log('✅ Created analytics_cache collection');
            
        } catch (error) {
            console.log('⚠️  Collections may already exist:', error.message);
        }
    }

    async insertSampleData() {
        console.log('\n📊 Inserting sample data...');
        
        const sampleSessions = [
            {
                user_id: 1,
                book_id: 1,
                session_start: new Date(Date.now() - 2 * 60 * 60 * 1000),
                session_end: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
                device_info: { 
                    device_type: 'mobile', 
                    os: 'Android', 
                    app_version: '1.0.0' 
                },
                pages_read: 30,
                total_pages: 328,
                reading_progress: 9.1,
                highlights: [
                    { page: 10, text: 'Great quote here', highlight_type: 'text' },
                    { page: 25, text: 'Important concept', highlight_type: 'text' }
                ],
                bookmarks: [
                    { page: 15, note: 'Important chapter' },
                    { page: 30, note: 'Review this section' }
                ],
                session_quality: { 
                    focus: 0.9, 
                    comprehension: 0.8,
                    speed: 1.2 
                },
                location: { 
                    country: 'VN', 
                    city: 'Ho Chi Minh' 
                },
                created_at: new Date()
            },
            {
                user_id: 2,
                book_id: 2,
                session_start: new Date(Date.now() - 90 * 60 * 1000),
                session_end: new Date(Date.now() - 45 * 60 * 1000),
                device_info: { 
                    device_type: 'desktop', 
                    os: 'Windows', 
                    app_version: '1.0.0' 
                },
                pages_read: 25,
                total_pages: 279,
                reading_progress: 9.0,
                highlights: [
                    { page: 5, text: 'Key insight', highlight_type: 'text' }
                ],
                bookmarks: [
                    { page: 40, note: 'Reference material' }
                ],
                session_quality: { 
                    focus: 0.8, 
                    comprehension: 0.9,
                    speed: 1.0 
                },
                location: { 
                    country: 'VN', 
                    city: 'Hanoi' 
                },
                created_at: new Date()
            },
            {
                user_id: 1,
                book_id: 3,
                session_start: new Date(Date.now() - 3 * 60 * 60 * 1000),
                session_end: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
                device_info: { 
                    device_type: 'tablet', 
                    os: 'iOS', 
                    app_version: '1.0.0' 
                },
                pages_read: 45,
                total_pages: 450,
                reading_progress: 10.0,
                highlights: [
                    { page: 20, text: 'Amazing discovery', highlight_type: 'text' },
                    { page: 35, text: 'Need to remember this', highlight_type: 'text' },
                    { page: 40, text: 'Critical information', highlight_type: 'text' }
                ],
                bookmarks: [
                    { page: 25, note: 'Study this chapter' },
                    { page: 50, note: 'Practice problems' }
                ],
                session_quality: { 
                    focus: 0.95, 
                    comprehension: 0.85,
                    speed: 1.1 
                },
                location: { 
                    country: 'VN', 
                    city: 'Da Nang' 
                },
                created_at: new Date()
            },
            {
                user_id: 3,
                book_id: 1,
                session_start: new Date(Date.now() - 1 * 60 * 60 * 1000),
                session_end: new Date(Date.now() - 30 * 60 * 1000),
                device_info: { 
                    device_type: 'mobile', 
                    os: 'iOS', 
                    app_version: '1.0.0' 
                },
                pages_read: 20,
                total_pages: 328,
                reading_progress: 6.1,
                highlights: [],
                bookmarks: [
                    { page: 10, note: 'Interesting start' }
                ],
                session_quality: { 
                    focus: 0.7, 
                    comprehension: 0.8,
                    speed: 0.9 
                },
                location: { 
                    country: 'VN', 
                    city: 'Can Tho' 
                },
                created_at: new Date()
            },
            {
                user_id: 2,
                book_id: 4,
                session_start: new Date(Date.now() - 4 * 60 * 60 * 1000),
                session_end: new Date(Date.now() - 3 * 60 * 60 * 1000),
                device_info: { 
                    device_type: 'desktop', 
                    os: 'macOS', 
                    app_version: '1.0.0' 
                },
                pages_read: 60,
                total_pages: 200,
                reading_progress: 30.0,
                highlights: [
                    { page: 15, text: 'Brilliant explanation', highlight_type: 'text' },
                    { page: 30, text: 'Key formula', highlight_type: 'text' },
                    { page: 45, text: 'Important theorem', highlight_type: 'text' },
                    { page: 50, text: 'Example to remember', highlight_type: 'text' }
                ],
                bookmarks: [
                    { page: 20, note: 'Chapter summary' },
                    { page: 35, note: 'Exercises' },
                    { page: 55, note: 'Review section' }
                ],
                session_quality: { 
                    focus: 0.9, 
                    comprehension: 0.9,
                    speed: 1.3 
                },
                location: { 
                    country: 'VN', 
                    city: 'Hue' 
                },
                created_at: new Date()
            }
        ];

        try {
            const result = await this.db.collection('reading_sessions').insertMany(sampleSessions);
            console.log(`✅ Inserted ${result.insertedCount} reading sessions`);
        } catch (error) {
            console.log('⚠️  Sample data may already exist:', error.message);
        }
    }

    async createIndexes() {
        console.log('\n🔍 Creating indexes...');
        
        try {
            // Create indexes for reading_sessions collection
            await this.db.collection('reading_sessions').createIndex({ user_id: 1 });
            console.log('✅ Created index on user_id');
            
            await this.db.collection('reading_sessions').createIndex({ book_id: 1 });
            console.log('✅ Created index on book_id');
            
            await this.db.collection('reading_sessions').createIndex({ session_start: -1 });
            console.log('✅ Created index on session_start');
            
            await this.db.collection('reading_sessions').createIndex({ 'device_info.device_type': 1 });
            console.log('✅ Created index on device_type');
            
            await this.db.collection('reading_sessions').createIndex({ 
                user_id: 1, 
                book_id: 1, 
                session_start: -1 
            });
            console.log('✅ Created compound index on user_id, book_id, session_start');
            
        } catch (error) {
            console.log('⚠️  Indexes may already exist:', error.message);
        }
    }

    async displayResults() {
        console.log('\n📊 MongoDB Setup Results:');
        console.log('========================');
        
        try {
            const collections = await this.db.listCollections().toArray();
            console.log(`📚 Collections created: ${collections.length}`);
            collections.forEach(col => {
                console.log(`   - ${col.name}`);
            });
            
            const sessionCount = await this.db.collection('reading_sessions').countDocuments();
            console.log(`📖 Sample reading sessions: ${sessionCount}`);
            
            const indexCount = await this.db.collection('reading_sessions').indexes();
            console.log(`🔍 Indexes created: ${indexCount.length}`);
            
        } catch (error) {
            console.log('⚠️  Could not display results:', error.message);
        }
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new MongoSetup();
    setup.runSetup().catch(console.error);
}

module.exports = MongoSetup;
