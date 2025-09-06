const bcrypt = require('bcryptjs');
const { mysqlPool } = require('./config/database');

async function fixAdminPassword() {
    try {
        console.log('Fixing admin password...');
        
        // Generate new password hash for admin123
        const password = 'admin123';
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        console.log('New password hash:', passwordHash);
        
        // Update admin password in database
        const [result] = await mysqlPool.execute(
            'UPDATE users SET password_hash = ? WHERE username = ?',
            [passwordHash, 'admin']
        );
        
        console.log('Updated rows:', result.affectedRows);
        
        // Verify the password works
        const [users] = await mysqlPool.execute(
            'SELECT password_hash FROM users WHERE username = ?',
            ['admin']
        );
        
        if (users.length > 0) {
            const isValid = await bcrypt.compare(password, users[0].password_hash);
            console.log('Password verification test:', isValid ? 'SUCCESS' : 'FAILED');
        }
        
        console.log('Admin password fixed successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');
        
    } catch (error) {
        console.error('Error fixing admin password:', error);
    } finally {
        process.exit(0);
    }
}

fixAdminPassword();