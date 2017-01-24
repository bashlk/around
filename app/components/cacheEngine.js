import { AsyncStorage } from 'react-native';
import Config from '../components/config.js';
import Functions from '../components/functions.js';

var cachedPostIDs = new Map();
var postListeners = [];
var user = '';

export default class CacheEngine{
	static initialize(currentUser){
		user = currentUser;
		return AsyncStorage.getItem('@Post:CachedPosts').then(cached => {
			if(cached){
				cachedPostIDs = new Map(JSON.parse(cached));
				return false;
			} else {
				return true;
			}
		})
	}

	static addPostListener(listener){
		postListeners.push(listener);
	}
	
	static async loadPosts(postsToLoad, placeID, locationName){
		var getPostIDs = [], refreshPostIDs = [], posts = [];

		postsToLoad.forEach(post => {
			trimmedPost = {
				rowKey: post.RowKey,
				placeID: placeID || post.PartitionKey
			}

			if(cachedPostIDs.has(post.RowKey)){
				refreshPostIDs.push(trimmedPost);
				posts.push(true);
			} else {
				getPostIDs.push(trimmedPost);
				posts.push(false)
			}
		})

		var gotPosts = [], refreshedPosts = [], loadOperations = [];
		if(getPostIDs.length>0){
			loadOperations.push(Functions.timeout(fetch(`${Config.SERVER}/api/posts/getPostContents?token=${user.token}&posts=${JSON.stringify(getPostIDs)}`).then(response => response.json()).then(response => {
				gotPosts = response.data;
			})))
		}

		if(refreshPostIDs.length>0){
			loadOperations.push(Functions.timeout(fetch(`${Config.SERVER}/api/posts/getPostVariable?token=${user.token}&posts=${JSON.stringify(refreshPostIDs)}`).then(response => response.json()).then(response => {
				refreshedPosts = response.data;
			})))
		}

		var none = await Promise.all(loadOperations).catch(error => {
			throw new Error('Fetch error');
		});

		var currentPost = {};
		for(var index = 0; index < posts.length; index++){
			if(posts[index]){
				currentPost = refreshedPosts.shift();
				currentPost.LocationName = locationName || postsToLoad[index].LocationName;
				var cachedPost = await AsyncStorage.getItem('@Post:' + currentPost.RowKey).then(post => JSON.parse(post));
				currentPost = Object.assign(cachedPost, currentPost); 
				AsyncStorage.setItem('@Post:' + currentPost.RowKey, JSON.stringify(currentPost));
			} else {
				currentPost = gotPosts.shift();
				currentPost.LocationName = locationName || postsToLoad[index].LocationName;
				AsyncStorage.setItem('@Post:' + currentPost.RowKey, JSON.stringify(currentPost));
				cachedPostIDs.set(currentPost.RowKey, null);
			}
			posts[index] = currentPost;
		}
		AsyncStorage.setItem('@Post:CachedPosts', JSON.stringify([...cachedPostIDs]))

		return posts;
	}

	static loadFromCache(posts){
		var loadOperations = []
		posts.forEach(post => {
			loadOperations.push(AsyncStorage.getItem('@Post:' + post.RowKey).then(post => {
				return JSON.parse(post);
			}))
		})
		return Promise.all(loadOperations);
	}

	static loadSingle(postID){
		return AsyncStorage.getItem('@Post:' + postID).then(post => JSON.parse(post));
	}

	static addPost(message, location, attachment, onLocation){
		return Functions.timeout(fetch(Config.SERVER + '/api/posts/addPost', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				token: user.token,
				message: message,
				placeID: location.RowKey,
				onLocation
			})
		})).then(response => response.json()).then(result => {
			var uploadAttachment = 	new Promise(function(resolve, reject){
				if(attachment){
					var attach = {
						uri: attachment,
						type: 'image/jpeg',
						name: 'attachment.jpg'
					}

					var body = new FormData();
					body.append('token', user.token);
					body.append('rowKey', result.RowKey);
					body.append('attachment', attach);
					body.append('placeID', location.RowKey)

					fetch(Config.SERVER + '/api/posts/addAttachment', {
						method: 'POST',
						headers: {
							'Content-Type': 'multipart/form-data'
						},
						body: body
					}).then(()=>{
						resolve(result.RowKey);
					})
				} else {
					resolve(result.RowKey);
				}
			})
			return Promise.resolve(uploadAttachment);
		}).then((postID)=>{
			var post = {
				PartitionKey: location.RowKey,
				RowKey: postID,
				Message: message,
				Username: user.username,
				BoostCount: 0,
				Boosted: false,
				CommentCount: 0,
				PostTimestamp: new Date().toISOString(),
				LocationName: location.Name,
				HasAttachment: attachment ? true : false,
				OnLocation: onLocation
			}
			AsyncStorage.setItem('@Post:' + post.RowKey, JSON.stringify(post));
			cachedPostIDs.set(post.RowKey, null);
			AsyncStorage.setItem('@Post:CachedPosts', JSON.stringify([...cachedPostIDs]));
			this.addInterestPost(post);
			return post;
		})
	}

	static updatePost(post){
		AsyncStorage.mergeItem('@Post:' + post.RowKey, JSON.stringify(post));
		postListeners.forEach(listener => {
			listener(post);
		})
	}

	static boost(post){
		return Functions.timeout(fetch(`${Config.SERVER}/api/posts/boost`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				token: user.token,
				rowKey: post.RowKey,
				placeID: post.PlaceID
			})
		})).then(() => {
			this.updatePost(post);
		})
	}

	static getComments(post){
		return Functions.timeout(fetch(`${Config.SERVER}/api/posts/getComments?token=${user.token}&rowKey=${post.RowKey}&placeID=${post.PartitionKey}`).then(response => response.json()).then(comments => {
			post.Comments = comments.data;
			this.updatePost(post);
			return comments.data;
		}))
	}

	static addComment(post, comment){
		return Functions.timeout(fetch(`${Config.SERVER}/api/posts/addComment`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				token: user.token,
				rowKey: post.RowKey,
				placeID: post.PlaceID,
				comment: comment
			})
		})).then(()=>{
			this.updatePost(post);
			this.addInterestPost(post);
		})

	}

	static addInterestPost(post){
		user.interestPosts.set(post.RowKey, null);
		AsyncStorage.setItem('@User:InterestPosts', JSON.stringify([...user.interestPosts]));
	}
}