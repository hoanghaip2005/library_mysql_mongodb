const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

// MySQL Configuration
const mysqlConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'xuanlanh1',  // Use your actual password here
    database: process.env.MYSQL_DATABASE || 'smart_library',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// MongoDB Configuration
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_library_analytics';

// MySQL Connection Pool
const mysqlPool = mysql.createPool(mysqlConfig);

// MongoDB Connection
let mongoClient;
let mongoDb;

const connectMongoDB = async () => {
    try {
        mongoClient = new MongoClient(mongoUri);
        await mongoClient.connect();
        mongoDb = mongoClient.db('smart_library_analytics');
        console.log('Connected to MongoDB successfully');
        return mongoDb;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

const getMongoDB = () => {
    if (!mongoDb) {
        throw new Error('MongoDB not connected. Call connectMongoDB() first.');
    }
    return mongoDb;
};

// Test MySQL connection
const testMySQLConnection = async () => {
    try {
        const connection = await mysqlPool.getConnection();
        console.log('Connected to MySQL successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('MySQL connection error:', error);
        return false;
    }
};

// Graceful shutdown
const closeConnections = async () => {
    try {
        await mysqlPool.end();
        if (mongoClient) {
            await mongoClient.close();
        }
        console.log('Database connections closed');
    } catch (error) {
        console.error('Error closing database connections:', error);
    }
};

module.exports = {
    mysqlPool,
    connectMongoDB,
    getMongoDB,
    testMySQLConnection,
    closeConnections
};
