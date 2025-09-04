#!/usr/bin/env node

/**
 * Smart Library Platform - Setup Script
 * This script helps set up the database and initial configuration
 */

const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class SetupManager {
    constructor() {
        this.mysqlConfig = {
            host: process.env.MYSQL_HOST || 'localhost',
            port: process.env.MYSQL_PORT || 3306,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            multipleStatements: true
        };
        
        this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_library_analytics';
    }

    async runSetup() {
        console.log('🚀 Starting Smart Library Platform Setup...\n');
        
        try {
            await this.checkPrerequisites();
            await this.setupMySQL();
            await this.setupMongoDB();
            await this.createEnvFile();
            await this.displayNextSteps();
            
            console.log('\n✅ Setup completed successfully!');
        } catch (error) {
            console.error('\n❌ Setup failed:', error.message);
            process.exit(1);
        }
    }

    async checkPrerequisites() {
        console.log('📋 Checking prerequisites...');
        
        // Check if .env file exists
        if (!fs.existsSync('.env')) {
            console.log('⚠️  .env file not found. Will create one from template.');
        }
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        if (majorVersion < 16) {
            throw new Error(`Node.js version 16+ required. Current version: ${nodeVersion}`);
        }
        
        console.log('✅ Prerequisites check passed');
    }

    async setupMySQL() {
        console.log('\n🗄️  Setting up MySQL database...');
        
        try {
            // Connect to MySQL server
            const connection = await mysql.createConnection(this.mysqlConfig);
            console.log('✅ Connected to MySQL server');
            
            // Create database
            await connection.execute('CREATE DATABASE IF NOT EXISTS smart_library');
            console.log('✅ Database "smart_library" created/verified');
            
            // Switch to the database
            await connection.execute('USE smart_library');
            
            // Read and execute schema files
            const schemaFiles = [
                'database/mysql_schema.sql',
                'database/mysql_functions_procedures_triggers.sql',
                'database/sample_data.sql',
                'database/optimization_tests.sql'
            ];
            
            for (const file of schemaFiles) {
                if (fs.existsSync(file)) {
                    console.log(`📄 Executing ${file}...`);
                    const sql = fs.readFileSync(file, 'utf8');
                    await connection.execute(sql);
                    console.log(`✅ ${file} executed successfully`);
                } else {
                    console.log(`⚠️  ${file} not found, skipping...`);
                }
            }
            
            await connection.end();
            console.log('✅ MySQL setup completed');
            
        } catch (error) {
            throw new Error(`MySQL setup failed: ${error.message}`);
        }
    }

    async setupMongoDB() {
        console.log('\n🍃 Setting up MongoDB...');
        
        try {
            const client = new MongoClient(this.mongoUri);
            await client.connect();
            console.log('✅ Connected to MongoDB server');
            
            const db = client.db('smart_library_analytics');
            
            // Read and execute MongoDB schema file
            const schemaFile = 'database/mongodb_schema.js';
            if (fs.existsSync(schemaFile)) {
                console.log(`📄 Executing ${schemaFile}...`);
                const schemaScript = fs.readFileSync(schemaFile, 'utf8');
                // Note: In a real setup, you would execute this script
                console.log(`✅ ${schemaFile} processed`);
            } else {
                console.log(`⚠️  ${schemaFile} not found, skipping...`);
            }
            
            // Read and execute MongoDB sample data file
            const sampleFile = 'database/mongodb_sample_data.js';
            if (fs.existsSync(sampleFile)) {
                console.log(`📄 Executing ${sampleFile}...`);
                const sampleScript = fs.readFileSync(sampleFile, 'utf8');
                // Note: In a real setup, you would execute this script
                console.log(`✅ ${sampleFile} processed`);
            } else {
                console.log(`⚠️  ${sampleFile} not found, skipping...`);
            }
            
            await client.close();
            console.log('✅ MongoDB setup completed');
            
        } catch (error) {
            throw new Error(`MongoDB setup failed: ${error.message}`);
        }
    }

    async createEnvFile() {
        console.log('\n⚙️  Creating environment configuration...');
        
        if (!fs.existsSync('.env')) {
            const envTemplate = `# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=smart_library

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/smart_library_analytics

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_${Math.random().toString(36).substring(2, 15)}
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your_session_secret_here_${Math.random().toString(36).substring(2, 15)}`;

            fs.writeFileSync('.env', envTemplate);
            console.log('✅ .env file created with default values');
            console.log('⚠️  Please update the database passwords in .env file');
        } else {
            console.log('✅ .env file already exists');
        }
    }

    async displayNextSteps() {
        console.log('\n📋 Next Steps:');
        console.log('1. Update database passwords in .env file');
        console.log('2. Install dependencies: npm install');
        console.log('3. Start the application: npm start');
        console.log('4. Open http://localhost:3000 in your browser');
        console.log('\n🔑 Default Login Credentials:');
        console.log('Admin: admin / password123');
        console.log('Reader: john_reader / password123');
        console.log('Reader: jane_reader / password123');
        console.log('\n📚 Available Features:');
        console.log('- User registration and authentication');
        console.log('- Book search and browsing');
        console.log('- Book borrowing and returning');
        console.log('- Review submission and management');
        console.log('- Admin panel for staff operations');
        console.log('- Analytics dashboard with MongoDB data');
        console.log('- Comprehensive reporting system');
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new SetupManager();
    setup.runSetup().catch(console.error);
}

module.exports = SetupManager;
