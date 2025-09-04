# Smart Library Platform - Setup Instructions

## Prerequisites

1. **Node.js** (version 16 or higher)
2. **MySQL** (version 5.7 or higher)
3. **MongoDB** (version 4.4 or higher)

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup

#### MySQL Setup
1. Create MySQL database:
```sql
CREATE DATABASE smart_library;
```

2. Run the schema and data files:
```bash
mysql -u root -p smart_library < database/mysql_schema.sql
mysql -u root -p smart_library < database/mysql_functions_procedures_triggers.sql
mysql -u root -p smart_library < database/sample_data.sql
mysql -u root -p smart_library < database/optimization_tests.sql
```

#### MongoDB Setup
1. Start MongoDB service
2. Run the MongoDB schema:
```bash
mongo smart_library_analytics < database/mongodb_schema.js
```

### 3. Environment Configuration

Create a `.env` file in the root directory with the following content:

```env
# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=smart_library

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/smart_library_analytics

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 4. Start the Application
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check MongoDB URI in .env file
   - Verify MongoDB port (default: 27017)

2. **MySQL Connection Error**
   - Ensure MySQL is running
   - Check MySQL credentials in .env file
   - Verify database exists

3. **Port Already in Use**
   - Change PORT in .env file
   - Or kill the process using the port

### Database Connection Issues

If you see connection errors, check:
1. Database services are running
2. Credentials are correct
3. Firewall settings allow connections
4. Database names match exactly

## Features

- **User Authentication**: Register/Login system
- **Book Management**: Search, borrow, return books
- **Review System**: Rate and review books
- **Admin Panel**: Manage books, authors, and view reports
- **Analytics**: Reading patterns and statistics
- **Reports**: Various library reports

## Default Accounts

After running sample data:
- **Staff Account**: username: `admin`, password: `admin123`
- **Reader Account**: username: `reader1`, password: `reader123`

## API Endpoints

- `/api/auth/*` - Authentication
- `/api/books/*` - Book operations
- `/api/checkouts/*` - Checkout operations
- `/api/reviews/*` - Review operations
- `/api/admin/*` - Admin operations
- `/api/analytics/*` - Analytics data
- `/api/reports/*` - Report generation

## Performance Testing

Run performance tests:
```bash
mysql -u root -p smart_library < database/optimization_tests.sql
```

## Support

For issues or questions, check the documentation files:
- `PERFORMANCE_EVIDENCE.md` - Performance optimization details
- `CONCURRENCY_TEST.md` - Concurrency management details
- `README.txt` - General project information
