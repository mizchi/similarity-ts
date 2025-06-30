// Real-world examples of code that should be detected by overlap detection

// Example 1: Common validation patterns
function createUser(userData) {
    // Email validation pattern
    if (!userData.email) {
        throw new Error('Email is required');
    }
    if (!userData.email.includes('@')) {
        throw new Error('Invalid email format');
    }
    
    // Password validation
    if (!userData.password) {
        throw new Error('Password is required');
    }
    if (userData.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    
    return db.users.create(userData);
}

function updateUserEmail(userId, newEmail) {
    // Same email validation pattern (should be extracted)
    if (!newEmail) {
        throw new Error('Email is required');
    }
    if (!newEmail.includes('@')) {
        throw new Error('Invalid email format');
    }
    
    return db.users.update(userId, { email: newEmail });
}

// Example 2: Data transformation patterns
function formatOrdersForExport(orders) {
    const formatted = [];
    for (const order of orders) {
        formatted.push({
            orderId: order.id,
            customerName: order.customer.name,
            totalAmount: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
            orderDate: new Date(order.createdAt).toISOString(),
            status: order.status.toUpperCase()
        });
    }
    return formatted;
}

function formatOrdersForReport(orderList) {
    const reportData = [];
    // Very similar transformation logic
    for (const order of orderList) {
        reportData.push({
            orderId: order.id,
            customerName: order.customer.name,
            totalAmount: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
            orderDate: new Date(order.createdAt).toISOString(),
            status: order.status.toUpperCase(),
            itemCount: order.items.length // Additional field
        });
    }
    return reportData;
}

// Example 3: Error handling patterns
async function fetchUserProfile(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
        return { success: false, error: error.message };
    }
}

async function fetchUserSettings(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/settings`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Failed to fetch user settings:', error);
        return { success: false, error: error.message };
    }
}

// Example 4: Array processing patterns
function getActiveUsers(users) {
    const activeUsers = [];
    for (let i = 0; i < users.length; i++) {
        if (users[i].isActive && users[i].lastLogin > Date.now() - 30 * 24 * 60 * 60 * 1000) {
            activeUsers.push(users[i]);
        }
    }
    return activeUsers;
}

function getRecentlyActiveUsers(userList) {
    const recentUsers = [];
    // Similar but not identical logic
    for (let i = 0; i < userList.length; i++) {
        if (userList[i].isActive && userList[i].lastLogin > Date.now() - 7 * 24 * 60 * 60 * 1000) {
            recentUsers.push({
                id: userList[i].id,
                name: userList[i].name,
                lastLogin: userList[i].lastLogin
            });
        }
    }
    return recentUsers;
}