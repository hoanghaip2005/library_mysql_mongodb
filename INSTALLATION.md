# Smart Library Platform - Installation Guide

## Quick Start

### 1. Prerequisites
- Node.js 16+ 
- MySQL 8.0+
- MongoDB 4.4+

### 2. Installation Steps

```bash
# Clone the repository
git clone <repository-url>
cd smart-library-platform

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env file with your database credentials
# Update MYSQL_PASSWORD and MONGODB_URI if needed

# Run setup script
npm run setup

# Start the application
npm start
```

### 3. Access the Application
- Main Application: http://localhost:3000
- Analytics Dashboard: http://localhost:3000/analytics.html

### 4. Default Login Credentials
- **Admin**: admin / password123
- **Reader**: john_reader / password123
- **Reader**: jane_reader / password123

## Manual Database Setup

If the setup script fails, you can manually set up the databases:

### MySQL Setup
```sql
-- Run these files in order:
source database/mysql_schema.sql
source database/mysql_functions_procedures_triggers.sql
source database/sample_data.sql
source database/optimization_tests.sql
```

### MongoDB Setup
```javascript
// Connect to MongoDB and run:
use smart_library_analytics
// Then run the scripts in:
// database/mongodb_schema.js
// database/mongodb_sample_data.js
```

## Performance Testing

Run performance tests to see query optimization results:

```bash
node test-performance.js
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check if MySQL and MongoDB services are running
   - Verify credentials in .env file
   - Ensure databases exist

2. **Port Already in Use**
   - Change PORT in .env file
   - Kill existing processes on port 3000

3. **Permission Errors**
   - Ensure proper database user permissions
   - Check file system permissions

## Features Overview

- ✅ User Authentication & Authorization
- ✅ Book Search & Browsing
- ✅ Book Borrowing & Returning
- ✅ Review System
- ✅ Admin Panel
- ✅ Analytics Dashboard
- ✅ Comprehensive Reporting
- ✅ Performance Optimization
- ✅ Mobile Responsive Design
