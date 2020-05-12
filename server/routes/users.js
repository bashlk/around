var express = require('express');
var azure = require('azure-storage');
var nconf = require('nconf');
var SortedSet = require('sorted-set');
var jwt = require('jsonwebtoken');

var router = express.Router();
nconf.env().file({ file: 'values.json', search: true });

var tableService = azure.createTableService(nconf.get("STORAGE_NAME"), nconf.get("STORAGE_KEY"));
var entGen = azure.TableUtilities.entityGenerator;

router.get('/getPoints', function(req, res) {
	var response = new Object();
	tableService.retrieveEntity('users', 'U', req.user.username, function (error, discard , user) {
		response.status = 'success';
		response.data = {
			Points: user.body.Points
		}
		res.send(response);
	})
})

router.get('/getProfile', function(req, res) {
	var response = {};
	if (req.query.username) {
		tableService.retrieveEntity('users', 'U', req.query.username, function (error, discard , user) {
			if(!error){
				response.status = 'success';
				getRanking(user.body.RowKey, user.body.Points).then((ranking)=> {
					response.data = {
						Points: user.body.Points,
						PostCount: user.body.PostCount,
						ViewCount: user.body.ViewCount,
						BoostCount: user.body.BoostCount,
						LocationCount: user.body.LocationCount,
						LocationPostCount: user.body.LocationPostCount,
						Rank: ranking.rank,
						Ahead: ranking.ahead,
						NextRank: ranking.nextRank
					}
					res.send(response);
				})
			} else {
				response.status = 'error';
				response.error = 'Invalid user';
				res.send(response);
			}
		})
	} else {
		response.status = 'error';
        response.error = 'Required parameters (username) missing';
        res.send(response);
	}
})

router.get('/getPinnedPosts', function(req, res) {
	var response = {};
	tableService.retrieveEntity('users', 'U', req.user.username, function (error, discard , user) {
		response.status = 'success';
		response.data = JSON.parse(user.body.PinnedPosts);
		res.send(response);
	})
})

router.post('/addPinnedPost', function(req, res) {
	var response = {};
	if (req.body.postID) {
		tableService.retrieveEntity('users', 'U', req.user.username, function (error, user) {
			var pinnedPosts = JSON.parse(user.PinnedPosts._);
			pinnedPosts.push(req.body.postID);
			user.PinnedPosts._ = JSON.stringify(pinnedPosts);

			tableService.mergeEntity('users', user, function(error){
				response.status = 'success';
				res.send(response);
			});
		})
	} else {
		response.status = 'error';
        response.error = 'Required parameters (postID) missing';
        res.send(response);
	}
})

router.post('/addFeedback', function(req, res) {
	var response = {};
	if (req.body.message) {
		var feedback ={
			PartitionKey: entGen.String('feedback'),
    		RowKey: entGen.String(new Date().toISOString()),
    		Message: entGen.String(req.body.message)
		}
		tableService.insertEntity('feedback', feedback, function (error) {
			if(!error){
				response.status = 'success';
			} else {
				response.status='error';
    			response.error = 'Internal server error';
			}
			res.send(response);
		})
	} else {
		response.status = 'error';
        response.error = 'Required parameters (message) missing';
        res.send(response);
	}
})

router.post('/refreshToken', function(req, res){
    var response = new Object();
    tableService.retrieveEntity('users', 'U', req.user.username, function(error) {
    	if(!error){
    		response.status = 'success';
	   		 jwt.sign({username: req.user.username}, nconf.get("TOKEN_SECRET"), {expiresIn: nconf.get("TOKEN_EXPIRY")}, function(error, token){
	    		response.Token = token;
	    		res.send(response);
	    	}); 
    	} else {
    		response.status = 'error';
    		response.error = 'User account disabled';
    		res.send(response);
    	}
    })
})

function getRanking(username, userpoints){
	return new Promise(function(resolve, reject){
		var query = new azure.TableQuery().select(['RowKey', 'Points']);

		tableService.queryEntities('users', query, null, function (error, discard, result) {
			var set = new SortedSet({compare: (a,b)=>{return b - a}});
			var ahead = 0;
			result.body.value.forEach(user => {
				set.add(user.Points);
				if(user.Points < userpoints){
					ahead++;
				}
			})
			var rank = set.rank(userpoints);
			var ranking = {
				rank: rank + 1,
				ahead,
				nextRank:  set.slice(rank-1, rank)[0] - userpoints || 'n/a'
			}
			resolve(ranking);
		})
	})
}

module.exports = router;