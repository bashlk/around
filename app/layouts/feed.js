import React, { Component } from 'react';
import {View, Text, Image, ListView, AsyncStorage, TouchableNativeFeedback, Dimensions, ToastAndroid, ToolbarAndroid, TextInput, Button} from 'react-native';
import Config from '../components/config.js';
import Functions from '../components/functions.js';
import CacheEngine from '../components/cacheEngine.js';
import PostCard from '../components/postCard.js';

export default class Feed extends Component {
	constructor(props) {
		super(props);
		this.dataSource = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
		this.state = {
			postSource: this.dataSource.cloneWithRows([]),
			locationSource: this.dataSource.cloneWithRows([]),
			currentPosts: [],
			currentLocations: [],
			notifications: 0
		}
		this.feed = {
			isLoading: false
		}
	}

	render() {
		return(
		<View style={{flex: 1}}>
			<View style={{height: 50, backgroundColor: '#E91E63', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
				<Text style={{fontSize: 20, color: 'white', fontWeight: 'bold', margin: 15}}>Feed</Text>

				<View style={{flexDirection: 'row'}}>
					<TouchableNativeFeedback onPress={()=>{this.actionSelected.call(this, 0)}} background={TouchableNativeFeedback.Ripple('#F8BBD0', true)}>
						<View style={{flexDirection: 'row', marginTop: 10, borderRadius: 35}}>
							<Image style={{width: 35, height: 35}} source={require('../images/notification_icon.png')}/>
							{this.state.notifications > 0 &&
							<View style={{width: 20, height: 20, borderRadius: 18, marginTop: 15, marginLeft: -18, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center'}}>
								<Text style={{fontSize: 12}}>{this.state.notifications}</Text>
							</View>
							}
						</View>
					</TouchableNativeFeedback>

					<TouchableNativeFeedback onPress={()=>{this.actionSelected.call(this, 1)}} background={TouchableNativeFeedback.Ripple('#F8BBD0', true)}>
						<View style={{marginLeft: 15, marginVertical: 10, borderRadius: 35}}>
							<Image style={{width: 35, height: 35}} source={require('../images/refresh_icon.png')} />
						</View>
					</TouchableNativeFeedback>

					<TouchableNativeFeedback onPress={()=>{this.actionSelected.call(this, 2)}} background={TouchableNativeFeedback.Ripple('#F8BBD0', true)}>
						<View style={{marginLeft: 15, marginRight: 10, marginVertical: 10, borderRadius: 35}}>
							<Image style={{width: 35, height: 35}} source={require('../images/search_icon.png')} />
						</View>
					</TouchableNativeFeedback>
				</View>
			</View>
			
			<View style={{flex: 20}}>
				<View style={{flex: 3, marginTop: 10}}>
					{this.state.currentLocations.length > 0 &&
					<ListView
						dataSource={this.state.postSource}
						renderRow={this.renderPost.bind(this)}
						renderHeader={this.renderHeader.bind(this)}
						onEndReached={this.scrollLoad.bind(this)}
						onEndReachedThreshold={400}
					/>}
				</View>
			</View>
		</View>
		)
	}

	renderPost(post, sectionID, rowID) {
		return (
			<PostCard post={post} navigator={this.props.navigator} showLocation={true} updatePost={this.updatePost.bind(this, rowID)}/>
		)
	}

	renderHeader(){
		return (
			<View style={{flex: 1}}>
				<Text style={{marginLeft: 10}}>Locations around</Text>
				{!this.feed.isLoading && this.state.currentLocations.length == 0 &&
					<Text style={{textAlign: 'center'}}>No locations around</Text>
				}
				{this.state.currentLocations.length > 0 &&
				<ListView
					dataSource={this.state.locationSource}
					renderRow={this.renderLocation.bind(this)}
				/>}

				<View style={{paddingHorizontal: 5, marginTop: 6}}>
					{this.state.currentLocations.length > 3 &&
						<Button onPress={()=>{this.props.navigator.push({screen: 'locations', locations: this.state.currentLocations})}} title="Show more locations" color="#E91E63"/>
					}
					
					{this.state.currentLocations.length <= 3 &&
						<Button onPress={()=>{this.props.navigator.push({screen: 'addLocation'})}} title="Add new location" color="#E91E63"/>
					}
				</View>

				<Text style={{marginLeft: 10, marginTop: 10}}>Posts around</Text>
				{this.state.currentPosts.length == 0 &&
					<Text style={{textAlign: 'center'}}>No posts around</Text>
				}
			</View>
		)	
	}

	renderLocation(location) {
		return (
			<TouchableNativeFeedback onPress={this.showLocation.bind(this, location)} background={TouchableNativeFeedback.Ripple('#F8BBD0')}>
				<View style={{flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F5F5F5', marginHorizontal: 5, marginTop: 6, padding: 10, elevation: 1}}>
					<View>
						<Text style={{flex: 1, fontWeight: 'bold', color: '#E91E63'}}>{location.Name}</Text>
						<Text style={{fontSize: 10}}>{location.Address}</Text>
					</View>

					{location.Activity > 0 &&
					<View style={{justifyContent: 'center', marginRight: 10}}>
						<View style={{width: 30, height: 20, borderRadius: 5, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center'}}>
							<Text style={{color: 'white', fontWeight: 'bold'}}>{location.Activity}</Text>
						</View>
					</View>
					}
				</View>
			</TouchableNativeFeedback>
		)
	}

	async componentDidMount() {
		this.props.isLoading(true);

		var firstLoad = await CacheEngine.initialize(this.props.user);
		if(!firstLoad){
			AsyncStorage.getItem('@Post:CurrentPostIDs').then(json => JSON.parse(json)).then(currentPostIDs => {
				CacheEngine.loadFromCache(currentPostIDs.slice(0, Config.CACHE_INITIAL_LOAD)).then(currentPosts => {
					this.setState({
						currentPosts,
						postSource: this.dataSource.cloneWithRows(currentPosts)
					})
				})
			})
			AsyncStorage.getItem('@Location:CurrentLocations').then(json => JSON.parse(json)).then(currentLocations => {
				this.setState({
					currentLocations,
					locationSource: this.dataSource.cloneWithRows(currentLocations)
				})
			})
		}

		this.loadNotifications.call(this);
	}

	async componentWillReceiveProps(nextProps){
		if(nextProps.isOnline && nextProps.user.location && !this.state.currentPostIDs && !this.feed.isLoading){
			this.loadFeed.call(this);
		}
	}

	async loadFeed(){
		try {
			this.props.isLoading(true);
			this.feed.isLoading = true;
			var feed = await Functions.timeout(fetch(`${Config.SERVER}/api/posts/getFeed?token=${this.props.user.token}&lat=${this.props.user.location.lat}&lon=${this.props.user.location.lon}`).then(response => response.json()));
			this.loadLocations.call(this, feed.data.locations);
			var posts = await CacheEngine.loadPosts(feed.data.posts.slice(0, Config.CACHE_INITIAL_LOAD));
			this.props.isLoading(false);
			this.feed.isLoading = false;
			this.setState({
				currentPosts: posts,
				currentPostIDs: feed.data.posts,
				postSource: this.dataSource.cloneWithRows(posts)
			})
			AsyncStorage.setItem('@Post:CurrentPostIDs', JSON.stringify(feed.data.posts));
		} catch (error){
			console.log(error);
			ToastAndroid.show('An error occurred while loading posts. Press refresh to try again', ToastAndroid.LONG);
			this.setState({
				currentPostIDs: []
			})
			this.props.isLoading(false);
			this.feed.isLoading = false;
		}
	}

	async scrollLoad(){
		var currentLevel = this.state.currentPosts.length;

		if(!this.props.isLoading() && !this.state.isOffline && currentLevel<this.state.currentPostIDs.length){
			this.props.isLoading(true);

			var postsToLoad = this.state.currentPostIDs.slice(currentLevel, currentLevel + Config.CACHE_INITIAL_LOAD);
			var newPosts = await CacheEngine.loadPosts(postsToLoad).catch((error)=>{
				ToastAndroid.show('An error occurred while loading more posts', ToastAndroid.LONG);
				this.props.isLoading(false);
			});

			var currentPosts = this.state.currentPosts.concat(newPosts);
			this.setState({
				currentPosts,
				postSource: this.dataSource.cloneWithRows(currentPosts),
			})
			this.props.isLoading(false);
		}
	}

	async loadLocations(locations){
		this.lastsync = await AsyncStorage.getItem('@Location:LastSync').then(lastsync => lastsync && new Map(JSON.parse(lastsync)));
		if(!this.lastsync){
			this.lastsync = new Map();
		}
		
		var locationsToGet = [], temp = null;
		locations.forEach(location => {
			temp = {
				placeID: location.RowKey,
			}
			if(this.lastsync.has(location.RowKey)){
				temp.lastSync = this.lastsync.get(location.RowKey)
			}
			locationsToGet.push(temp)
		})

		var activity = await Functions.timeout(fetch(`${Config.SERVER}/api/locations/getLocationActivity?token=${this.props.user.token}&locations=${JSON.stringify(locationsToGet)}`).then(response => response.json()));
		var index = 0
		activity.data.forEach(location => {
			locations[index].Activity = location.Activity;
			index++;
		})

		locations.sort((a, b)=>b.Activity - a.Activity);

		this.setState({
			currentLocations: locations,
			locationSource: this.dataSource.cloneWithRows(locations)
		})
		AsyncStorage.setItem('@Location:CurrentLocations', JSON.stringify(locations));
	}

	async loadNotifications(){
		if(!this.props.user.interestPosts){
			this.props.user.interestPosts = await AsyncStorage.getItem('@User:InterestPosts').then(interestPosts => interestPosts && new Map(JSON.parse(interestPosts)));
			if(!this.props.user.interestPosts){
				this.props.user.interestPosts = new Map();

				// var userPosts = await Functions.timeout(fetch(`${Config.SERVER}/api/posts/getCreatedPosts?token=${this.props.user.token}`).then(response => response.json()));
				// userPosts.data.forEach(post => {
				// 	this.props.user.interestPosts.set(post.RowKey, null);
				// })
				// if(this.props.user.interestPosts.size > 0){
				// 	CacheEngine.loadPosts(userPosts.data);
				// }

				this.props.user.notifications = {
					data: [],
					lastsync: new Date((new Date)*1 - 43200000).toISOString() //12 hours ago
				}
				AsyncStorage.mergeItem('@User', JSON.stringify({notifications: this.props.user.notifications}));
				AsyncStorage.setItem('@User:InterestPosts', JSON.stringify([...this.props.user.interestPosts]));
			}
		}

		if(this.props.user.interestPosts.size > 0){
			var interestPosts = Array.from(this.props.user.interestPosts.keys());
			var newNotifications = await Functions.timeout(fetch(`${Config.SERVER}/api/posts/getPostActivity?token=${this.props.user.token}&posts=${JSON.stringify(interestPosts)}&lastsync=${this.props.user.notifications.lastsync}`).then(response => response.json()));
			this.props.user.notifications.data.push(...newNotifications.data);
			this.props.user.notifications.current = newNotifications.data.length
			this.setState({
				notifications: newNotifications.data.length
			})
		}
	}

	showLocation(location){
		this.props.isLoading(false);
		location.Activity = 0;
		this.props.navigator.push({
			screen: 'showLocation',
			location: location,
			addPost: this.addPost.bind(this),
			onLocation: true
		})
		this.lastsync.set(location.RowKey, new Date().toISOString());
		AsyncStorage.setItem('@Location:LastSync', JSON.stringify([...this.lastsync]));
	}

	actionSelected(pos){
		this.props.isLoading(false);
		if(pos==0){
			this.setState({
				notifications: 0
			})

			this.props.navigator.push({
				screen: 'notifications'
			})
		} else if(pos==1){
			if(!this.feed.isLoading){
				this.loadFeed.call(this);
				this.loadNotifications.call(this);
			}
		} else if(pos==2){
			this.props.navigator.push({
				screen: 'search'
			})
		}
	}

	addPost(post){
		this.state.currentPosts.unshift(post);
		this.state.currentPostIDs.unshift(post.RowKey);
		this.setState({
			postSource: this.dataSource.cloneWithRows(this.state.currentPosts)
		})
	}

	updatePost(index, post){
		if(this.state.currentPosts[index].RowKey == post.RowKey)
			this.state.currentPosts[index] = Object.assign(this.state.currentPosts[index], post);
	}

	addLocation(){
		this.props.isLoading(false);
		this.props.navigator.push({
			screen: 'addLocation'
		})
	}
}
