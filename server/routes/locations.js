var async = require('async');
var azure = require('azure-storage');
var express = require('express');
var nconf = require('nconf');
var fetch = require('node-fetch');
var mysql  = require('mysql');

var router = express.Router();
nconf.env().file({ file: 'values.json', search: true });
var tableService = azure.createTableService(nconf.get("STORAGE_NAME"), nconf.get("STORAGE_KEY"));
var entGen = azure.TableUtilities.entityGenerator;
var pool = mysql.createPool({
	host     : 'localhost',
	port: '55369',
	user     : 'azure',
	password : '',
	database : 'around_db'
})

router.get('/search', function (req, res) {
	var response = new Object();
	if(req.query.keyword){
		pool.query(`SELECT * FROM locations WHERE MATCH(Name, Address) AGAINST ('${req.query.keyword}*' IN BOOLEAN MODE)`, function (error, results, fields) {
			if (!error){
				response.status = 'success';
				response.data = results;
			} else {
				response.status='error';
				response.error = 'Internal server error';
			}
			res.send(response);
		});
	} else {
		response.status = 'error';
        response.error = 'No search keyword given';
        res.send(response);
	}
})

router.post('/addLocation', function (req, res) {
	var response = new Object();
	if(req.body.placeID){
		fetch(`https://maps.googleapis.com/maps/api/place/details/json?key=${nconf.get("MAPS_KEY")}&placeid=${req.body.placeID}&language=en`).then(response => response.json()).then(mapRes => {
			if(mapRes.status= 'OK'){
				var key = mapRes.result.name.toLowerCase().replace(/ /g,'');

				var newLocation = {
					PartitionKey: entGen.String('record'),
					RowKey: entGen.String(req.body.placeID),
					Name: entGen.String(mapRes.result.name),
					Address: entGen.String(mapRes.result.formatted_address),
					Lat: entGen.Double(degToRad(mapRes.result.geometry.location.lat)),
					Lon: entGen.Double(degToRad(mapRes.result.geometry.location.lng)),
					Creator: entGen.String(req.user.username)	
				}

				tableService.insertOrReplaceEntity('locations', newLocation, function (error) {
					if(!error){
						response.status='success';
						response.data = {
							Name: mapRes.result.name,
							Address: mapRes.result.formatted_address
						}
						res.send(response);
						pool.query(`INSERT INTO locations VALUES('${req.body.placeID}', '${mapRes.result.name}', '${mapRes.result.formatted_address}')`, function (error) {});

						tableService.retrieveEntity('users', 'U', req.user.username, function (error, user) {
							user.LocationCount._++;
							tableService.mergeEntity('users', user, function(error){});
						})
					} else {
						response.status='error';
						response.error = 'Internal server error';
						res.send(response);
					}
				})
			} else {
				response.status = 'error',
				response.error = "Invalid place ID or daily quota expired"
				res.send(response);
			}
		})
	} else {
		response.status = 'error';
		response.error = 'Required parameters (placeID) missing';
		res.send(response);
	}
})

router.get('/searchMaps', function(req, res) {
	var response = new Object();
	if (req.query.keyword && req.query.lat && req.query.lon) {
		fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${nconf.get("MAPS_KEY")}&location=${req.query.lat},${req.query.lon}&radius=1300&language=en&type=establishment&keyword=${req.query.keyword}`).then(response => response.json()).then(mapRes => {
			if(mapRes.status= 'OK'){
				var locations = [], location = {};
				mapRes.results.forEach(result=> {
					location = {
						PlaceID: result.place_id,
						Name: result.name,
						Address: result.vicinity,
						Type: result.types[0]
					}
					locations.push(location);
				})
				response.status='success';
				response.data = locations;
				res.send(response);
			} else {
				response.status = 'error',
				response.error = "Daily quota expired"
				res.send(response);
			}
		})
	} else {
		response.status = 'error';
        response.err = 'Required parameters (keyword, lat, lon) missing';
        res.send(response);
	}
})

router.get('/getLocationActivity', function (req, res) {
	var response = new Object();

	if(req.query.locations){
		var locations = JSON.parse(req.query.locations);
		var timestamp = new Date().toISOString();

		var activity = [];

		async.eachSeries(locations, function(location, callback){
			var queryString = null;
			if(location.lastSync){
				queryString = `PartitionKey eq '${location.placeID}' and RowKey ge '${location.lastSync}' and RowKey lt '${timestamp}' and Username ne '${req.user.username}'`;
			} else {
				queryString = `PartitionKey eq '${location.placeID}' and Username ne '${req.user.username}'`;
			}
			
			var query = new azure.TableQuery().select(['Username']).where(queryString);
			tableService.queryEntities('activity', query, null, function (error, discard, result) {
				if(!error){
					activity.push({
						RowKey: location.placeID,
						Activity: result.body.value.length
					})
					callback();
				} else {
					callback(error)
				}
			})
		}, function(error){
			if(!error){
				response.status = 'success';
				response.data = activity;
			} else {
				response.status='error';
    			response.error = 'Internal server error';
			}
			res.send(response);
		})
	} else {
		response.status = 'error';
		response.error = 'Required parameters missing (locations)'
		res.send(response);
	}
})

router.get('/getHypeLocations', function (req, res) {
	var response = new Object();
	var query = new azure.TableQuery().select(['PartitionKey']);
	tableService.queryEntities('activity', query, null, function (error, discard, result) {
		if(!error){
			var activity = new Map();
			result.body.value.forEach(record => {
				if(record.PartitionKey.length>25){
					if(!activity.has(record.PartitionKey)){
						activity.set(record.PartitionKey, {count: 0});
						return;
					}
					activity.get(record.PartitionKey).count++;
				}
			})
			var locations = Array.from(activity.keys());
			var data = [];
			async.each(locations, function(location, callback){
				tableService.retrieveEntity('locations', 'record' , location, function (error, discard, result) {
					data.push({
						RowKey: result.body.RowKey,
						Name: result.body.Name,
						Address: result.body.Address,
						Activity: activity.get(location).count
					})
					callback();
				})
			}, function(error){
				if(!error){
					data.sort((a, b)=>b.Activity - a.Activity);
					response.status = 'success';
					response.data = data;
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
})

function degToRad(deg){
	deg = deg * Math.PI / 180;
	return Math.round(deg * 100000000)/100000000;
}

module.exports = router;