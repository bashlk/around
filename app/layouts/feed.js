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
			isLoading: false,
			loaded: false
		}
	}

	render() {
		return(
		<View style={{flex: 1, backgroundColor: 'white'}}>
			<View style={{height: 50, backgroundColor: '#E91E63', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
				<Text style={{fontSize: 20, color: 'white', fontWeight: 'bold', margin: 15}}>Feed</Text>

				<View style={{flexDirection: 'row'}}>
					<TouchableNativeFeedback onPress={()=>{this.actionSelected.call(this, 0)}}>
						<View style={{flexDirection: 'row', marginTop: 10}}>
							<Image style={{width: 35, height: 35}} source={require('../images/notification_icon.png')}/>
							{this.state.notifications > 0 &&
							<View style={{width: 20, height: 20, borderRadius: 18, marginTop: 15, marginLeft: -18, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center'}}>
								<Text style={{fontSize: 12}}>{this.state.notifications}</Text>
							</View>
							}
						</View>
					</TouchableNativeFeedback>

					<TouchableNativeFeedback onPress={()=>{this.actionSelected.call(this, 1)}}>
						<View style={{marginLeft: 15, marginVertical: 10}}>
							<Image style={{width: 35, height: 35}} source={require('../images/refresh_icon.png')} />
						</View>
					</TouchableNativeFeedback>

					<TouchableNativeFeedback onPress={()=>{this.actionSelected.call(this, 2)}}>
						<View style={{marginLeft: 15, marginVertical: 10}}>
							<Image style={{width: 35, height: 35}} source={require('../images/search_icon.png')} />
						</View>
					</TouchableNativeFeedback>

					<TouchableNativeFeedback onPress={()=>{this.actionSelected.call(this, 3)}}>
						<View style={{marginLeft: 10, marginRight: 10, marginVertical: 10}}>
							<Image style={{width: 35, height: 35}} source={require('../images/feedback_icon.png')} />
						</View>
					</TouchableNativeFeedback>
				</View>
			</View>
			
			<View style={{flex: 20}}>
				<View style={{flex: 3, marginTop: 10}}>
					<ListView
						dataSource={this.state.postSource}
						renderRow={this.renderPost.bind(this)}
						renderHeader={this.renderHeader.bind(this)}
						onEndReached={this.scrollLoad.bind(this)}
						onEndReachedThreshold={400}
					/>
				</View>
			</View>
		</View>
		)
	}

	renderPost(post, sectionID, rowID) {
		return (
			<PostCard post={post} navigator={this.props.navigator} showLocation={true} updatePost={this.updatePost.bind(this, rowID)} addPost={this.addPost.bind(this)}/>
		)
	}

	renderHeader(){
		return (
			<View style={{flex: 1}}>
				{this.feed.loaded && this.state.currentLocations.length == 0 &&
					<View style={{marginVertical: 15}}>
						<Text style={{textAlign: 'center'}}>No locations around.</Text>
						<Text style={{textAlign: 'center', fontSize: 10}}>Add a new location or explore other locations with search</Text>
					</View>
				}
				{this.state.currentLocations.length > 0 &&
				<View>
					<Text style={{marginLeft: 10}}>Locations around</Text>
					<ListView
						dataSource={this.state.locationSource}
						renderRow={this.renderLocation.bind(this)}
					/>
				</View>
				}

				<View style={{paddingHorizontal: 5, marginTop: 6}}>
					{this.state.currentLocations.length > 3 &&
						<Button onPress={()=>{this.props.navigator.push({screen: 'locations', locations: this.state.currentLocations, addPost: this.addPost.bind(this), addLocation: this.addLocation.bind(this)})}} title={"View " + (this.state.currentLocations.length - 3) + " other locations"} color="#E91E63"/>
					}
					
					{this.state.currentLocations.length <= 3 &&
						<Button onPress={this.addNewLocation.bind(this)} title="Add new location" color="#E91E63"/>
					}
				</View>

				{this.state.currentLocations.length > 0 &&
				<View>
					<Text style={{marginLeft: 10, marginTop: 10}}>Posts around</Text>
						{this.state.currentPosts.length == 0 &&
							<Text style={{textAlign: 'center'}}>No posts around</Text>
						}
				</View>
				}
			</View>
		)	
	}

	renderLocation(location) {
		return (
			<TouchableNativeFeedback onPress={this.showLocation.bind(this, location)}>
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
		var firstLoad = await CacheEngine.initialize(this.props.user);
		if(!firstLoad){
			AsyncStorage.getItem('@Post:CurrentPostIDs').then(json => JSON.parse(json)).then(currentPostIDs => {
				CacheEngine.loadFromCache(currentPostIDs.slice(0, Config.CACHE_INITIAL_LOAD)).then(currentPosts => {
					this.setState({
						currentPostIDs,
						currentPosts,
						postSource: this.dataSource.cloneWithRows(currentPosts)
					})
				})
			})
			AsyncStorage.getItem('@Location:CurrentLocations').then(json => JSON.parse(json)).then(currentLocations => {
				this.setState({
					currentLocations,
					locationSource: this.dataSource.cloneWithRows(currentLocations.slice(0, 3))
				})
			})
		}
		if(this.props.isOnline){
			this.loadNotifications.call(this);
			this.props.isLoading(true);
		}
	}

	async componentWillReceiveProps(nextProps){
		if(nextProps.isOnline && nextProps.user.location && !this.feed.loaded && !this.feed.isLoading){
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
			this.setState({
				currentPosts: posts,
				currentPostIDs: feed.data.posts,
				postSource: this.dataSource.cloneWithRows(posts)
			})
			this.feed.isLoading = false;
			this.feed.loaded = true;
			AsyncStorage.setItem('@Post:CurrentPostIDs', JSON.stringify(feed.data.posts));
			this.props.user.tracker.trackEvent('app', 'loadedLocations', {value: feed.data.locations.length});
			this.props.user.tracker.trackEvent('app', 'loadedPosts', {value: feed.data.posts.length});
		} catch (error){
			ToastAndroid.show('An error occurred while loading feed. Press refresh to try again', ToastAndroid.LONG);
			this.props.isLoading(false);
			this.feed.isLoading = false;
			this.props.user.tracker.trackException(`LF-${JSON.stringify(error)}`, false);
		}
	}

	async scrollLoad(){
		var currentLevel = this.state.currentPosts.length;

		if(!this.props.isLoading() && this.state.currentPostIDs && currentLevel<this.state.currentPostIDs.length){
			this.props.isLoading(true);

			var postsToLoad = this.state.currentPostIDs.slice(currentLevel, currentLevel + Config.CACHE_INITIAL_LOAD);
			try{
				var newPosts = null;
				if(this.props.isOnline){
					newPosts = await CacheEngine.loadPosts(postsToLoad);
				} else {
					newPosts = await CacheEngine.loadFromCache(postsToLoad);
				}
				
				var currentPosts = this.state.currentPosts.concat(newPosts);
				this.setState({
					currentPosts,
					postSource: this.dataSource.cloneWithRows(currentPosts),
				})
				this.props.user.tracker.trackEvent('app', 'scrollLoad', {value: currentLevel});
			} catch(error){
				ToastAndroid.show('An error occurred while loading more posts', ToastAndroid.LONG);
				this.props.user.tracker.trackException(`FSL-${JSON.stringify(error)}`, false);
			} finally {
				this.props.isLoading(false);
			}
		}
	}

	async loadLocations(locations){
		CacheEngine.loadLocations(locations).then(locations => {
			this.setState({
				currentLocations: locations,
				locationSource: this.dataSource.cloneWithRows(locations.slice(0, 3))
			})
			AsyncStorage.setItem('@Location:CurrentLocations', JSON.stringify(locations));
		}).catch(error => {
			ToastAndroid.show('An error occurred while loading feed. Press refresh to try again', ToastAndroid.LONG);
			this.props.isLoading(false);
			this.feed.isLoading = false;
			this.props.user.tracker.trackException(`LL-${JSON.stringify(error)}`, false);
		})	
	}

	async loadNotifications(){
		if(!this.props.user.interestPosts){
			this.props.user.interestPosts = await AsyncStorage.getItem('@User:InterestPosts').then(interestPosts => interestPosts && new Map(JSON.parse(interestPosts)));
			if(!this.props.user.interestPosts){
				try {
					this.props.user.interestPosts = new Map();
					var userPosts = await Functions.timeout(fetch(`${Config.SERVER}/api/posts/getCreatedPosts?token=${this.props.user.token}`).then(response => response.json()));
					userPosts.data.forEach(post => {
						this.props.user.interestPosts.set(post.RowKey, null);
					})
					if(this.props.user.interestPosts.size > 0){
						CacheEngine.loadPosts(userPosts.data);
					}
					AsyncStorage.setItem('@User:InterestPosts', JSON.stringify([...this.props.user.interestPosts]));

					this.props.user.notifications = {
						data: [],
						lastsync: new Date().toISOString()
					}
					AsyncStorage.mergeItem('@User', JSON.stringify({notifications: this.props.user.notifications}));
				} catch (error) {
					ToastAndroid.show('An error occurred while loading notifications.', ToastAndroid.LONG);
					this.props.user.tracker.trackException(`LNI-${JSON.stringify(error)}`, false);
					return;
				}
			}
		}

		try{
			var interestPosts = Array.from(this.props.user.interestPosts.keys());
			var newNotifications = await Functions.timeout(fetch(`${Config.SERVER}/api/posts/getPostActivity?token=${this.props.user.token}&posts=${JSON.stringify(interestPosts)}&lastsync=${this.props.user.notifications.lastsync}`).then(response => response.json()));
			this.props.user.notifications.data.unshift(...newNotifications.data);
			this.props.user.notifications.current = newNotifications.data.length
			this.setState({
				notifications: newNotifications.data.length
			})
		} catch (error) {
			ToastAndroid.show('An error occurred while loading notifications.', ToastAndroid.LONG);
			this.props.user.tracker.trackException(`LN-${JSON.stringify(error)}`, false);
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
	}

	actionSelected(pos){
		if(this.props.isOnline){
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
					this.props.user.tracker.trackEvent('app', 'refresh');
					this.loadNotifications.call(this);
					this.props.refreshLocation();
					this.feed.loaded = false;
				}
			} else if(pos==2){
				this.props.navigator.push({
					screen: 'search'
				})
			} else if(pos==3){
				this.props.navigator.push({
					screen: 'feedback'
				})
			}
		} else {
			ToastAndroid.show('You are offline. Please check your internet connection and try again', ToastAndroid.LONG);
		}
	}

	addPost(post){
		this.state.currentPosts.unshift(post);
		this.state.currentPostIDs.unshift(post.RowKey);
		this.setState({
			postSource: this.dataSource.cloneWithRows(this.state.currentPosts)
		})
	}

	addLocation(location){
		this.state.currentLocations.unshift(location);
		this.setState({
			locationSource: this.dataSource.cloneWithRows(this.state.currentLocations.slice(0, 3))
		})
	}

	updatePost(index, post){
		if(this.state.currentPosts[index].RowKey == post.RowKey)
			this.state.currentPosts[index] = Object.assign(this.state.currentPosts[index], post);
	}

	addNewLocation(){
		if(!this.props.isOnline){
			ToastAndroid.show('You are offline. Please check your internet connection and try again', ToastAndroid.LONG);
			return;
		}

		if(!this.props.user.location){
			ToastAndroid.show('Error: Location unavailable', ToastAndroid.LONG);
			return;
		}

		this.props.navigator.push({
			screen: 'addLocation', 
			addPost: this.addPost.bind(this), 
			addLocation: this.addLocation.bind(this)
		})
	}
}
