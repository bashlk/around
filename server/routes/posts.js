var async = require('async');
var azure = require('azure-storage');
var express = require('express');
var nconf = require('nconf');
var streamifier = require('streamifier');
var SortedList = require('container-sortedlist');

var router = express.Router();
nconf.env().file({ file: 'values.json', search: true });
var tableService = azure.createTableService(nconf.get("STORAGE_NAME"), nconf.get("STORAGE_KEY"));
var blobService = azure.createBlobService(nconf.get("STORAGE_NAME"), nconf.get("STORAGE_KEY"));
var entGen = azure.TableUtilities.entityGenerator;

var baseTime = 1486195975;

router.get('/getFeed', function(req, res){
	var response = new Object();
	if(req.query.lat && req.query.lon){
		req.query.lat = degToRad(req.query.lat);
		req.query.lon = degToRad(req.query.lon);

		var box = getBoundingBox(req.query.lat, req.query.lon);
		var queryString = `Lat ge ${box.latMin} and Lat le ${box.latMax} and Lon ge ${box.lonMin} and Lon le ${box.lonMax}`
		var query = new azure.TableQuery().select(['RowKey', 'Name', 'Lat', 'Lon', 'Address']).where(queryString);
		tableService.queryEntities('locations', query, null, function (error, discard, result) {
			if(!error){
				var posts = new SortedList(comparePosts);
				var tasks = [];

				result.body.value.forEach(location => {
					location.Score = Math.round(1000/calculateDistance(req.query.lat, req.query.lon, location.Lat, location.Lon));
					delete location['Lat'];
					delete location['Lon'];
					delete location['odata.etag'];

					tasks.push(function(callback){
						var postQuery = new azure.TableQuery().select(['PartitionKey', 'RowKey', 'Score']).where('PartitionKey eq ?', location.RowKey);
						tableService.queryEntities('posts', postQuery, null, function (error, discard, result) {
							if(!error){
								result.body.value.forEach(post => {
									delete post['odata.etag'];
									post.LocationName = location.Name;
									post.Score = location.Score + post.Score;
									posts.add(post)
								})
								callback(null);
							} else {
								callback(error);
							}
						})
					})

				})

				async.parallel(tasks, function(error){
					if(!error){
						response.status='success';
    					response.data = {
    						locations: result.body.value,
    						posts: posts.toArray()
    					}
					} else {
						response.status='error';
						response.error = 'Internal server error';
					}
					res.send(response);
				})
			} else {
				response.status='error';
				response.error = 'Internal server error';
				res.send(response);
			}
		})
}else {
	response.status = 'error';
	response.error = 'User location not specified'
	res.send(response);
}
})

router.get('/getPostContents', function (req, res) {
	var response = new Object();
	
	if(req.query.posts){
		var reqPosts = JSON.parse(req.query.posts);
		var gotPosts = [];
		var postOwners = [];

		async.eachSeries(reqPosts, function(post, callback){
			tableService.retrieveEntity('posts', post.placeID, post.rowKey, function (error, discard, result) {
				if (!error) {
					delete result.body['odata.metadata'];
					delete result.body['odata.etag'];
					delete result.body['Comments'];
					delete result.body['Timestamp'];

					var boost = JSON.parse(result.body.Boost);
					delete result.body['Boost'];
					result.body.Boosted = boost.indexOf(req.user.username)>=0
					
					gotPosts.push(result.body);
					postOwners.push(result.body.Username);
					callback();
				} else {
					callback(error);
				}
			})
		}, function(error){
			if(!error){
				response.status = 'success';
				response.data = gotPosts;
			} else {
				response.status='error';
    			response.error = 'Internal server error';
			}
			res.send(response);
			addSeenPoints(postOwners);
		})
	} else {
		response.status = 'error';
		response.error = 'No posts specified'
		res.send(response);
	}
})

router.get('/getPostVariable', function (req, res) {
	var response = new Object();

	if(req.query.posts){
		var reqPosts = JSON.parse(req.query.posts);
		var gotPosts = [];

		async.eachSeries(reqPosts, function(post, callback){
			tableService.retrieveEntity('posts', post.placeID, post.rowKey, function (error, discard, result) {
				if (!error) {
					var post = {
						RowKey: result.body.RowKey,
						BoostCount: result.body.BoostCount,
						CommentCount: result.body.CommentCount
					}

					gotPosts.push(post);
					callback();
				} else {
					callback(error);
				}
			})
		}, function(error){
			if(!error){
				response.status = 'success';
				response.data = gotPosts;
			} else {
				response.status='error';
    			response.error = 'Internal server error';
			}
			res.send(response);
		})
	} else {
		response.status = 'error';
		response.error = 'No posts specified'
		res.send(response);
	}
})

router.post('/addPost', function (req, res) {
	var response = new Object();
    if (req.body.message && req.body.placeID && req.body.onLocation) {
    	var newPostID = parseInt(nconf.get('FINAL_POSTID')) + 1;
    	var timestamp = new Date();
    	var newPost = {
    		PartitionKey: entGen.String(req.body.placeID),
    		RowKey: entGen.String(newPostID.toString()),
    		Message: entGen.String(req.body.message),
    		Username: entGen.String(req.user.username),
    		Boost: entGen.String(JSON.stringify([])),
    		BoostCount: entGen.Int32(0),
    		Comments: entGen.String(JSON.stringify([])),
    		CommentCount: entGen.Int32(0),
    		HasAttachment: entGen.Boolean(false),
    		PostTimestamp: entGen.String(timestamp.toISOString()),
    		Score: entGen.Int32(Math.floor(((new Date().getTime()/1000) - baseTime)/45000)),
    		OnLocation: entGen.Boolean(req.body.onLocation)
    	};

    	tableService.insertEntity('posts', newPost, function (error) {
    		if (!error) {
    			response.status = 'success';
    			response.RowKey = newPostID.toString();
    			nconf.set('FINAL_POSTID', newPostID);
    			nconf.save();
    		} else {
    			response.status='error';
    			response.error = 'Internal server error';
    		}
    		res.send(response);
    		addPostPoints(req.user.username, req.body.placeID);
    		logActivity(req.body.placeID, req.user.username);
    	});
    } else {
    	response.status = 'error';
		response.error = 'Required parameters missing (PlaceID, Message, OnLocation)'
		res.send(response);
    }
})

router.post('/boost', function (req, res) {
	var response = new Object();
	if(req.body.rowKey && req.body.placeID){
		tableService.retrieveEntity('posts', req.body.placeID, req.body.rowKey, function (error, object) {
			if(!error){
				var boost = JSON.parse(object.Boost._);
				
				if(!(boost.indexOf(req.user.username)>-1)){
					boost.push(req.user.username);
					object.Boost._ = JSON.stringify(boost);
					object.BoostCount._++;

					if(object.Username._ != req.user.username){
						object.Score._++;
					}

					var post = {
						PartitionKey: object.PartitionKey,
						RowKey: object.RowKey,
						Boost: object.Boost,
						BoostCount: object.BoostCount,
						Score: object.Score
					}

					tableService.mergeEntity('posts', post, function(error){
						if(!error){
							response.status = 'success';
						} else {
							response.status='error';
							response.error = 'Internal server error';
						}
						res.send(response);
						addBoostPoint(req.body.rowKey, req.body.placeID, req.user.username);
					})
				} else {
					response.status='success';
					res.send(response)
				}
			} else {
				response.status='error';
    			response.error = 'Internal server error';
    			res.send(response);
			}
		})
	} else {
		response.status = 'error';
		response.error = 'Required parameters missing (RowKey, PlaceID)'
		res.send(response);
	}
})

router.post('/addComment', function (req, res) {
	var response = new Object();
	if(req.body.rowKey && req.body.comment && req.body.placeID){
		tableService.retrieveEntity('posts', req.body.placeID, req.body.rowKey, function (error, object) {
			if(!error){
				var comment = {
					Username: req.user.username,
					Comment: req.body.comment,
					Timestamp: new Date().toISOString()
				}

				var currentComments = JSON.parse(object.Comments._);
				currentComments.push(comment);
				object.CommentCount._++;

				if(object.Username._ != req.user.username){
					object.Score._ = object.Score._ + 2;
				}

				var post = {
					RowKey: object.RowKey,
					PartitionKey: object.PartitionKey,
					Comments: entGen.String(JSON.stringify(currentComments)),
					CommentCount: object.CommentCount,
					Score: object.Score
				}

				tableService.mergeEntity('posts', post, function(error){
					if(!error){
						response.status = 'success';
					} else {
						response.status='error';
    					response.error = 'Internal server error';
					}
					res.send(response);
					logActivity(req.body.rowKey, req.user.username);
				})
			} else {
				response.status='error';
    			response.error = 'Internal server error';
    			res.send(response);
			}
		})
	} else {
		response.status = 'error';
		response.error = 'Required parameters missing (RowKey, PlaceID, Comment)'
		res.send(response);
	}
})

router.get('/getComments', function (req, res) {
	var response = new Object();

	if(req.query.rowKey && req.query.placeID){
		tableService.retrieveEntity('posts', req.query.placeID, req.query.rowKey, function (error, discard, result) {
			if(!error){
				response.status = 'success';
				response.data = JSON.parse(result.body.Comments);
			} else {
				response.status='error';
				response.error = 'Internal server error';
			}
			res.send(response);
		})
	} else {
		response.status = 'error';
		response.error = 'Required parameters missing (RowKey, PlaceID)'
		res.send(response);
	}
})

router.post('/addAttachment', function (req, res, next) {
    var response = new Object();
    if (req.file && req.body.rowKey && req.body.placeID) {
    	var fileStream = streamifier.createReadStream(req.file.buffer);
    	blobService.createBlockBlobFromStream('posts', req.body.rowKey, fileStream, req.file.buffer.length, function(error){
    		if(!error){
    			var post = {
					RowKey: req.body.rowKey,
					PartitionKey: req.body.placeID,
					HasAttachment: entGen.Boolean(true)
				}
				tableService.mergeEntity('posts', post, function(error){
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
    			response.error = 'Required parameters missing (rowKey, placeID, attachment)';
    			res.send(response);
    		}
    	});
    } else {
        response.status = 'error';
        response.error = 'Required parameters missing (rowKey, placeID, attachment)';
        res.send(response);
    }
})

router.get('/getLocationPosts', function (req, res) {
	var response = new Object();
	if(req.query.placeID){
		var query = new azure.TableQuery().select(['RowKey', 'Score']).where('PartitionKey eq ?', req.query.placeID);
		tableService.queryEntities('posts', query, null, function (error, discard, result) {
        	if(!error){
        		var posts = new SortedList(comparePosts);
        		result.body.value.forEach(function(post){
        			delete post['odata.etag'];
        			posts.add(post);
        		})
        		response.status='success';
				response.data = posts.toArray();
        	} else {
        		response.status='error';
				response.error = 'Internal server error';
        	}
        	res.send(response);
        })
	} else {
		response.status = 'error';
		response.error = 'No location specified'
		res.send(response);
	}
})

router.get('/getPostActivity', function (req, res) {
	var response = new Object();
	if(req.query.posts && req.query.lastsync){
		var posts = JSON.parse(req.query.posts);
		var timestamp = new Date().toISOString();
		var activity = [];

		async.each(posts, function(post, callback){
			var queryString = `PartitionKey eq '${post}' and RowKey ge '${req.query.lastsync}' and RowKey lt '${timestamp}' and Username ne '${req.user.username}'`;
			var query = new azure.TableQuery().select(['Username']).where(queryString);
			tableService.queryEntities('activity', query, null, function (error, discard, result) {
				if(!error){
					if(result.body.value.length>0){
						var postActivity = new Map();
						for(var index = 0; index <  result.body.value.length; index++){
							postActivity.set(result.body.value[index].Username, null);
						}
						activity.unshift({
							RowKey: post,
							Users: Array.from(postActivity.keys())
						})
					}
					callback();
				} else {
					callback(error)
				}
			})
		}, function(error){
			if(!error){
				var queryString = `(PartitionKey eq '${req.user.username}' or PartitionKey eq 'all') and RowKey ge '${req.query.lastsync}' and RowKey lt '${timestamp}'`;
				var query = new azure.TableQuery().select(['Message']).where(queryString);
				tableService.queryEntities('notifications', query, null, function (error, discard, result) {
					if(!error){
						result.body.value.forEach(notif => {
							activity.unshift({
								Message: notif.Message
							})
						})
						response.status = 'success';
						response.data = activity;
						res.send(response);
					} else {
						response.status='error';
						response.error = 'Internal server error';
						res.send(response);
					}
				})
			} else {
				response.status='error';
    			response.error = 'Internal server error';
    			res.send(response);
			}
		})
	} else {
		response.status = 'error';
		response.error = 'Required parameters missing (posts, lastsync)'
		res.send(response);
	}
})

router.get('/getCreatedPosts', function (req, res) {
	var response = new Object();
	var postQuery = new azure.TableQuery().select(['PartitionKey', 'RowKey']).where('Username eq ?', req.user.username);
	tableService.queryEntities('posts', postQuery, null, function (error, discard, result) {
		if(!error){
			response.status='success';
    		response.data = result.body.value;
		} else {
			response.status='error';
			response.error = 'Internal server error';	
		}
		res.send(response);
	})
})

function comparePosts(a, b){
	return b.Score - a.Score;
}

function addPostPoints(userID, placeID){
	tableService.retrieveEntity('users', 'U', userID, function (error, result) {
		result.PostCount._++;
		tableService.mergeEntity('users', result, function(error){});
	})

	tableService.retrieveEntity('locations', 'record', placeID, function (error, result, location) {
		if(location.body.Creator!=userID){
			tableService.retrieveEntity('users', 'U', location.body.Creator, function (error, user) {
				user.LocationPostCount._++;
				user.Points._++;
				tableService.mergeEntity('users', user, function(error){});
			})
		}
	})
}

function addBoostPoint(postID, placeID, userID){
	tableService.retrieveEntity('posts', placeID, postID, function (error, discard, post) {
		if(post.body.Username!=userID){
			tableService.retrieveEntity('users', 'U', post.body.Username, function (error, user) {
				user.BoostCount._++;
				user.Points._++;
				tableService.mergeEntity('users', user, function(error){});
			})
		}
	})
}

function addSeenPoints(postUserIDs){
	postUserIDs.forEach(userID=>{
		tableService.retrieveEntity('users', 'U', userID, function(error, user){
			user.ViewCount._++;
			tableService.mergeEntity('users', user, function(error){});
		})
	})
}

function logActivity(id, username){
	var activity = {
		PartitionKey: entGen.String(id),
		RowKey: entGen.String(`${new Date().toISOString()}--${Math.random().toString(36).substr(2, 7)}`),
		Username: entGen.String(username)
	}
	tableService.insertEntity('activity', activity, function(error){});
}

function getBoundingBox(lat, lon){
	var r = 0.00015696123;
	var lonDelta = Math.asin(Math.sin(r) / Math.cos(lat));
	var box = {
		latMin: (lat - r),
		lonMin: (lon - lonDelta),
		latMax: (lat + r),
		lonMax: (lon + lonDelta)
	}
	return box;
}

function degToRad(deg){
	deg = deg * Math.PI / 180;
	return Math.round(deg * 100000000)/100000000;
}

function calculateDistance(lat1, lon1, lat2, lon2){
    var lonDiff = lon2 - lon1;
    var radius = 6371000; 
    var result = Math.acos(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lonDiff)) * radius;
    return result;
}

module.exports = router;