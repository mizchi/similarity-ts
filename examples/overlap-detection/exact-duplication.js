// Test case 1: Exact duplication of code blocks

function processUserData(users) {
    const validUsers = [];
    // Exact duplicate block
    for (let i = 0; i < users.length; i++) {
        if (users[i].age >= 18 && users[i].isActive) {
            validUsers.push({
                id: users[i].id,
                name: users[i].name,
                email: users[i].email
            });
        }
    }
    return validUsers;
}

function filterActiveAdults(people) {
    const results = [];
    // Same logic, different variable names
    for (let i = 0; i < people.length; i++) {
        if (people[i].age >= 18 && people[i].isActive) {
            results.push({
                id: people[i].id,
                name: people[i].name,
                email: people[i].email
            });
        }
    }
    return results;
}

function validateAndTransform(items) {
    const output = [];
    // Similar pattern but with additional logic
    for (let i = 0; i < items.length; i++) {
        if (items[i].age >= 18 && items[i].isActive) {
            // Additional validation
            if (items[i].email && items[i].email.includes('@')) {
                output.push({
                    id: items[i].id,
                    name: items[i].name,
                    email: items[i].email,
                    validated: true
                });
            }
        }
    }
    return output;
}