var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');

//Routes
var auth = require('./routes/auth');
var posts = require('./routes/posts');
var locations = require('./routes/locations');
var users = require('./routes/users');

var app = express();

//Binding dependencies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/auth', auth);
app.use('/api/posts/addAttachment', multer().single('attachment'))

//Token verification
app.use('/api', function (req, res, next) {
    auth.verifyToken(req, res, next);
});

//Api Endpoints
app.use('/api/posts', posts);
app.use('/api/users', users);
app.use('/api/locations', locations);

app.use(express.static('public'));

module.exports = app;
