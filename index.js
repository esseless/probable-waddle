// ------------------ Fill the following details -----------------------------
// Student name: Sharanya Sargur Lakshminarasimhan
// Student email: ssargurlakshmin2161@conestogac.on.ca

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const {
    check,
    validationResult
} = require('express-validator');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/final8020set1', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Order = mongoose.model('Order', {
    name: String,
    phone: String,
    mangoJuices: Number,
    berryJuices: Number,
    appleJuices: Number
});

const Admin = mongoose.model('Admin', {
    uname: String,
    pass: String
});

const validator = require('./validator');
const juices = [{
    title: 'Apple Juice',
    name: 'apple',
    image: 'images/apple.jpeg',
    count: 0,
    price: 2.99,
    total: 0
}, {
    title: 'Berry Juice',
    name: 'berry',
    image: 'images/berry.jpeg',
    count: 0,
    price: 1.99,
    total: 0
}, {
    title: 'Mango Juice',
    name: 'mango',
    image: 'images/mango.jpeg',
    count: 0,
    price: 2.49,
    total: 0
}];

var myApp = express();
myApp.use(session({
    secret: 'superrandomsecret',
    resave: false,
    saveUninitialized: true
}));
myApp.use(bodyParser.urlencoded({
    extended: false
}));

myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname + '/public'));
myApp.set('view engine', 'ejs');

//------------- Use this space only for your routes ---------------------------


myApp.get('/', function (req, res) {
    // use this to display the order form
    juices.forEach(juice => {
        juice.count = 0;
        juice.total = 0;
    });
    res.render('form', {
        isLoggedIn: req.session.isLoggedIn,
        user: {},
        juices,
        errors: {}
    })
});

myApp.get('/orders', async function (req, res) {
    // use this to display all the orders when a user is logged in as admin
    // Guard
    if (req.session.isLoggedIn) {
        const orders = await Order.find().lean();
        orders.forEach(order => {
            const mango = juices.find(j => j.name === 'mango');
            const apple = juices.find(j => j.name === 'apple');
            const berry = juices.find(j => j.name === 'berry');
            order.subTotal = Number((Number((order.mangoJuices * mango.price).toFixed(2)) +
                Number((order.appleJuices * apple.price).toFixed(2)) +
                Number((order.berryJuices * berry.price).toFixed(2))).toFixed(2));
            order.tax = Number((.13 * order.subTotal).toFixed(2));
            order.total = Number((order.tax + order.subTotal).toFixed(2));
        });
        res.render('view-orders', {
            isLoggedIn: req.session.isLoggedIn,
            orders
        });
    } else {
        res.redirect('/login');
    }
});


// write any other routes here as needed

// Login page
myApp.get('/login', (req, res) => {
    res.render('login', {
        isLoggedIn: req.session.isLoggedIn,
        errors: {},
        credentials: {}
    });
});

myApp.post('/login', (req, res) => {
    const credentials = {
        username: req.body.username,
        password: req.body.password
    };
    Admin.findOne({
        uname: req.body.username,
        pass: req.body.password
    }, async (err, user) => {
        // User exists
        if (user) {
            req.session.isLoggedIn = true;
            res.redirect('/');
        }
        //User not found
        else {
            res.render('login', {
                isLoggedIn: req.session.isLoggedIn,
                errors: {
                    credentials: 'Invalid Credentials! Try Again!'
                },
                credentials
            });
        }
    }).lean();
});

// Success page
myApp.get('/action-success', (req, res) => {
    // Guard
    if (req.session.action) {
        const action = req.session.action;
        req.session.action = '';
        res.render('action-success', {
            isLoggedIn: req.session.isLoggedIn,
            action: action
        });
    } else {
        res.redirect('/login')
    }
});

// Logout
myApp.get('/logout', (req, res) => { // Authorize Guard
    if (req.session.isLoggedIn) {
        // Delete user session
        req.session.isLoggedIn = false;
        req.session.action = 'logged out';
        res.redirect('/action-success');
    } else {
        res.redirect('/login')
    }
});

// Receipt Page
myApp.post('/receipt',
    validator.getValidations(),
    (req, res) => {
        const cart = {
            items: [],
            user: {},
            subTotal: 0
        };

        juices.forEach(juice => {
            if (req.body[juice.name] > 0) {
                juice.count = parseInt(req.body[juice.name]);
                juice.total = Number((juice.count * juice.price).toFixed(2));
                cart.items.push(juice);
            }
        });
        var user = {
            name: req.body.name,
            phone: req.body.phone
        }
        cart.user = user;

        // Update total of carted items
        cart.subTotal = Number(cart.items.reduce((n, {
            total
        }) => n + total, 0).toFixed(2));

        const errors = validationResult(req);

        // Form has errors
        if (!errors.isEmpty()) {
            // Reducing to form field - field error pairs
            const formErrors = errors.array().reduce((list, e) => {
                list[e.param] = e.msg;
                return list;
            }, {});

            res.render('form', {
                isLoggedIn: req.session.isLoggedIn,
                juices,
                user,
                errors: formErrors
            });
        } else if (cart.subTotal === 0) {
            errors.formError = 'Add atleast one item to proceed.';
            res.render('form', {
                isLoggedIn: req.session.isLoggedIn,
                juices,
                errors,
                user
            });
        }
        // Form is valid
        else {
            // Compute tax for items in cart
            const tax = Number((.13 * cart.subTotal).toFixed(2));
            cart.tax = tax;
            cart.total = Number((cart.subTotal + cart.tax).toFixed(2));
            // save the current order
            const order = {
                name: user.name,
                phone: user.phone,
                mangoJuices: juices[2].count,
                berryJuices: juices[1].count,
                appleJuices: juices[0].count
            };
            Order.collection.insertOne(order);

            res.render('receipt', {
                isLoggedIn: req.session.isLoggedIn,
                cart
            });
        }
    });

// Delete result
myApp.get('/delete/:_id', async (req, res) => {
    const _id = req.params._id;
    Order.findByIdAndDelete(_id,
        (err, res) => {
            if (err) {
                console.log(`An error occured while deleting. ${err}`);
            }
        });

    req.session.action = 'deleted the order';
    return res.redirect('/action-success');
});
//---------- Do not modify anything below this other than the port ------------
//------------------------ Setup the database ---------------------------------

myApp.get('/setup', function (req, res) {

    let adminData = [{
        'uname': 'admin',
        'pass': 'admin'
    }];

    Admin.collection.insertMany(adminData);

    var firstNames = ['John ', 'Alana ', 'Jane ', 'Will ', 'Tom ', 'Leon ', 'Jack ', 'Kris ', 'Lenny ', 'Lucas '];
    var lastNames = ['May', 'Riley', 'Rees', 'Smith', 'Walker', 'Allen', 'Hill', 'Byrne', 'Murray', 'Perry'];

    let ordersData = [];

    for (i = 0; i < 10; i++) {
        let tempPhone = Math.floor((Math.random() * 1000)) + '-' + Math.floor((Math.random() * 1000)) + '-' + Math.floor((Math.random() * 10000))
        let tempName = firstNames[Math.floor((Math.random() * 10))] + lastNames[Math.floor((Math.random() * 10))];
        let tempOrder = {
            name: tempName,
            phone: tempPhone,
            mangoJuices: Math.floor((Math.random() * 10)),
            berryJuices: Math.floor((Math.random() * 10)),
            appleJuices: Math.floor((Math.random() * 10))
        };
        ordersData.push(tempOrder);
    }

    Order.collection.insertMany(ordersData);
    res.send('Database setup complete. You can now proceed with your exam.');

});

//----------- Start the server -------------------

myApp.listen(8080); // change the port only if 8080 is blocked on your system
console.log('Server started at 8080 for mywebsite...');