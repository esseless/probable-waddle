const {
    check
} = require('express-validator');

//Validation patterns
const patterns = {
    name: /^[a-zA-Z]{1,}\s[a-zA-Z]{1,}$/,
    phone: /^\d{3}-\d{3}-\d{4}$/,
    count: /^\d+$/
}

const getValidations = () => {
    return [
        check('name', 'Enter a valid name').matches(patterns.name),
        check('phone', 'Enter a valid phone').matches(patterns.phone),
        check('apple', 'Enter a valid qty').matches(patterns.count),
        check('mango', 'Enter a valid qty').matches(patterns.count),
        check('berry', 'Enter a valid qty').matches(patterns.count)
    ];
};

module.exports = {
    getValidations
}