import React, { Component } from 'react';
import {View, Text, Image, ListView, AsyncStorage, TouchableNativeFeedback, Dimensions, ToastAndroid, ToolbarAndroid, TextInput} from 'react-native';
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
			currentLocations: []
		}
		this.feed = {
			isLoading: false
		}
	}

	render() {
		return(
		<View style={{flex: 1}}>
			<ToolbarAndroid style={{height: 50, backgroundColor: '#E91E63'}} title="Feed" titleColor="white" 
				actions={[
					{title: 'Refresh', icon: require('../images/refresh_icon.png'), show: 'always'}, 
					{title: 'Search', icon: require('../images/search_icon.png'), show: 'always'}, 
					{title: 'Add message', icon: require('../images/add_icon.png'), show: 'always'}]} 
				onActionSelected={this.actionSelected.bind(this)}/>
			
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

					{!this.feed.isLoading && this.state.currentLocations.length == 0 &&
					
					<TouchableNativeFeedback onPress={this.addLocation.bind(this)} background={TouchableNativeFeedback.Ripple('#F8BBD0')}>
						<View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', elevation: 1, padding: 8}}>
							<Image style={{width: 30, height: 30, tintColor: '#E91E63'}} source={require('../images/add_icon.png')} />
							<View style={{marginLeft: 5}}>
								<Text>No locations around</Text>
								<Text style={{marginTop: -5}}>Tap here to add a new location</Text>
							</View>
						</View>
					</TouchableNativeFeedback>
					
					}
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
				{this.state.currentLocations.length > 0 &&
				<ListView
					dataSource={this.state.locationSource}
					renderRow={this.renderLocation.bind(this)}
				/>}

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
				<View style={{backgroundColor: '#F5F5F5', margin: 5, padding: 10, elevation: 1}}>
					<Text style={{flex: 1, fontWeight: 'bold', color: '#E91E63'}}>{location.Name}</Text>
					<Text style={{fontSize: 10}}>{location.Address}</Text>
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
			var posts = await CacheEngine.loadPosts(feed.data.posts.slice(0, Config.CACHE_INITIAL_LOAD));
			this.props.isLoading(false);
			this.feed.isLoading = false;
			this.setState({
				currentPosts: posts,
				currentPostIDs: feed.data.posts,
				currentLocations: feed.data.locations,
				postSource: this.dataSource.cloneWithRows(posts),
				locationSource: this.dataSource.cloneWithRows(feed.data.locations),
			})
			AsyncStorage.setItem('@Post:CurrentPostIDs', JSON.stringify(feed.data.posts));
			AsyncStorage.setItem('@Location:CurrentLocations', JSON.stringify(feed.data.locations));
		} catch (error){
			console.log(error);
			ToastAndroid.show('An error occurred while loading posts. Press refresh to try again', ToastAndroid.LONG);
			this.setState({
				currentPostIDs: []
			})
			this.props.isLoading(false);
			this.feed.isLoading = true;
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

	showLocation(location){
		this.props.isLoading(false);
		this.props.navigator.push({
			screen: 'showLocation',
			location: location,
			addPost: this.addPost.bind(this)
		})
	}

	actionSelected(pos){
		this.props.isLoading(false);
		if(pos==0){
			if(!this.feed.isLoading){
				this.loadFeed.call(this);
			}
		} else if(pos==1){
			this.props.navigator.push({
				screen: 'search'
			})
		} else if (pos==2){
			this.props.navigator.push({
				screen: 'addPost',
				locations: this.state.currentLocations,
				addPost: this.addPost.bind(this)
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
