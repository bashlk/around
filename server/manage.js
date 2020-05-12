var azure = require('azure-storage');
var uuid = require('node-uuid');

//Load azuire storage credentials from config.json
var nconf = require('nconf');
nconf.env().file({ file: 'values.json', search: true });

var tableService = azure.createTableService(nconf.get("STORAGE_NAME"), nconf.get("STORAGE_KEY"));

//users, locations, posts, activity, feedback, notification
//Create a table
// tableService.createTableIfNotExists('notifications', function (error, result, response) {
//    if (!error) {
//        console.log("Table created");
//    } else {
//    	   console.log(error);
//    }
// });

//Creating an entity
var entGen = azure.TableUtilities.entityGenerator;

//User
// var entity = {
//    PartitionKey: entGen.String('search'),
//    RowKey: entGen.String('informatics institute of technology'),
//    Address: entGen.String('57 Ramakrishna Rd, Colombo 00600, Sri Lanka'),
//    Lat: entGen.Double(0.119821591),
//    Lon: entGen.Double(1.393817331)
// };

// var entity = {
// 	PartitionKey: entGen.String('U'),
// 	RowKey: entGen.String('bash'),
// 	Points: entGen.Int32(0),
// 	PostCount: entGen.Int32(0),
// 	ViewCount: entGen.Int32(0),
// 	BoostCount: entGen.Int32(0),
// 	LocationCount: entGen.Int32(0),
// 	LocationPostCount: entGen.Int32(0),
// 	PinnedPosts: entGen.String(JSON.stringify([]))
// };

// var temp = [{
//   placeID: 'ChIJOVF9iBpF4joRzYeIiMZIilg'
// }]
var baseTime = 1486195975;
console.log(((new Date().getTime()/1000) - baseTime)/45000);

//Math.floor(((new Date().getTime()/1000) - baseTime)/45000)

// var entity = {
// 	PartitionKey: entGen.String('all'),
// 	RowKey: entGen.String(new Date().toISOString()),
// 	Message: 'Keep the broadcasts coming',
// 	LocationPostCount: 10
// };

// tableService.insertOrMergeEntity('notifications', entity, function (error, result, response) {
//    if (!error) {
//        console.log('Record added');
//    } else {
//        console.log(error);
//    }
// });

//tableService.updateEntity('posts', entity, function (error, result, response) {
//    if (!error) {
//        console.log('Record updated');
//    } else {
//        console.log(error);
//    }
//});

//Querying an entity by ID
// tableService.retrieveEntity('posts', '', 'Bash', function (error, result, response) {
//  if (!error) {
//   console.log('Individual entity');
//   var body = {
//     Email: "the.prabash.s@gmail.com",
//     Password: "YOLO"
//   }
//   Object.assign(response.body, body);
//   console.log(response.body);
// } else {
//  console.log(error);
// }
// });


//Advanced queries
// var query = new azure.TableQuery();
// tableService.queryEntities('locations', query, null, function (error, discard, response) {
//    if (!error) {
//         console.log(response.body.value);
//    } else {
//        console.log(error);
//    }
// });

////Deleting a record
// var entity = {
//    PartitionKey: entGen.String('ChIJv9waqLpb4joRbQ7fYtnuDVc'),
//    RowKey: entGen.String('113')
// }

// tableService.deleteEntity('posts', entity, function (error, response) {
//    if (!error) {
//        console.log("Record deleted successfully");
//    } else {
//        console.log(error);
//    }
// });

//users, locations, posts, activity, feedback, notifications
// Delete a table
// tableService.deleteTable('notification', function (error, response) {
//    if (!error) {
//        console.log('Table deleted');
//    } else {
//        console.log(error);
//    }
// });