var express = require('express');
var azure = require('azure-storage');
var nconf = require('nconf');
var hasher = require('password-hash');
var jwt = require('jsonwebtoken');

var router = express.Router();
nconf.env().file({ file: 'values.json', search: true });

var tableService = azure.createTableService(nconf.get("STORAGE_NAME"), nconf.get("STORAGE_KEY"));

router.post('/login', function (req, res) {
    var response = new Object();
    if (req.body.username && req.body.password) {
        req.body.username = req.body.username.toLowerCase();
        tableService.retrieveEntity('users', 'U', req.body.username, function (error, discard ,result) {
            if (!error) {
                if (hasher.verify(req.body.password, result.body.Password)) {
                    response.status = 'success';
                    jwt.sign({username: req.body.username}, nconf.get("TOKEN_SECRET"), {expiresIn: nconf.get("TOKEN_EXPIRY")}, function(error, token){
                    	response.Token = token;
                        response.Points = result.body.Points;
                    	res.send(response);
                    }); 
                } else {
                    response.status = 'error';
                    response.error = 'Invalid username or password. Please check your credentials.';
                    res.send(response);
                }
            } else {
                response.status = 'error';
                response.error = 'Invalid username or password. Please check your credentials.';
                res.send(response);
            }
        });
    } else {
        response.status = 'error';
        response.error = 'Required parameters (username, password) missing';
        res.send(response);
    }
});

router.post('/register', function (req, res) {
    var response = new Object();
    if (req.body.email && req.body.username && req.body.password) {
        req.body.username = req.body.username.toLowerCase();
        tableService.retrieveEntity('users', 'U', req.body.username, function (error) {
            if (error) {
                var entGen = azure.TableUtilities.entityGenerator;
                var entity = {
                    PartitionKey: entGen.String('U'),
                    RowKey: entGen.String(req.body.username),
                    Email: entGen.String(req.body.email),
                    Password: entGen.String(hasher.generate(req.body.password)),
                    Points: entGen.Int32(5),
                    PostCount: entGen.Int32(0),
                    ViewCount: entGen.Int32(0),
                    BoostCount: entGen.Int32(0),
                    LocationCount: entGen.Int32(0),
                    LocationPostCount: entGen.Int32(0),
                    JoinDate: entGen.String(new Date().toISOString())
                };
                
                tableService.insertEntity('users', entity, function (error) {
                    if (!error) {
                        response.status = 'success';
                   		 jwt.sign({username: req.body.username}, nconf.get("TOKEN_SECRET"), {expiresIn: nconf.get("TOKEN_EXPIRY")}, function(error, token){
                    		response.Token = token;
                    		res.send(response);
                    	}); 
                    } else {
                        response.status = 'error';
                        response.error = 'Internal server error';
                        res.send(response);
                    }
                });
            } else {
                response.status = 'error';
                response.error = 'Username already exists. Please try another username';
                res.send(response);
            }
        });
    } else {
        response.status = 'error';
        response.error = 'Required parameters missing';
        res.send(response);
    }
})

router.verifyToken = function (req, res, next){
    var response = new Object();
    var token = req.body.token || req.query.token;
    if (token) {
        jwt.verify(token, nconf.get("TOKEN_SECRET"), function (err, decoded) {
            if (!err) {
                req.user = decoded;
                next();
            } else {
                response.status = 'error';
                response.err = 'Invalid token';
                res.send(response);
            }
        });
    } else {
        response.status = 'error';
        response.err = 'No token provided';
        res.send(response);
    }
}

module.exports = router;