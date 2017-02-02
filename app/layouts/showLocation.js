import React, { Component } from 'react';
import {View, Text, Image, ListView, AsyncStorage, ToastAndroid, ToolbarAndroid, Dimensions, ActivityIndicator } from 'react-native';
import Config from '../components/config.js';
import Functions from '../components/functions.js';
import CacheEngine from '../components/cacheEngine.js';
import PostCard from '../components/postCard.js';

export default class ShowLocation extends Component {
	constructor(props){
		super(props);
		this.dataSource = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
		this.state = {
			postSource : null,
			currentPosts: [],
			actions: [],
			hasLoaded: false
		}
		if(this.props.addPost){
			this.state.actions = [{title: 'Add message', icon: require('../images/add_icon.png'), show: 'always'}];
		}
	}

	render() {
		return (
			<View style={{flex: 1,  backgroundColor: 'white'}}>
				<ToolbarAndroid style={{height: 50, backgroundColor: '#E91E63'}} title={this.props.location.Name} titleColor="white" navIcon={require('../images/back_icon.png')} onIconClicked={()=>{this.props.navigator.pop()}} actions={this.state.actions} onActionSelected={this.actionSelected.bind(this)}/>
				<View style={{flex: 20}}>
					<View style={{flex: 3, marginTop: 10}}>
						{this.state.currentPosts.length > 0 &&
						<ListView
							dataSource={this.state.postSource}
							renderRow={this.renderPost.bind(this)}
							onEndReached={this.scrollLoad.bind(this)}
							onEndReachedThreshold={400}
						/>}

						{this.state.currentPosts.length == 0 && this.state.hasLoaded &&
							<Text style={{textAlign: 'center'}}>No posts in this location</Text>
						}
					</View>
				</View>
			</View>
		)
	}

	renderPost(post, sectionID, rowID) {
		return (
			<PostCard post={post} navigator={this.props.navigator} showLocation={false} updatePost={this.updatePost.bind(this, rowID)}/>
		)
	}

	async componentDidMount() {
		AsyncStorage.getItem('@Location:' + this.props.location.RowKey).then(currentPostIDs => {
			if(currentPostIDs){
				currentPostIDs = JSON.parse(currentPostIDs);
				CacheEngine.loadFromCache(currentPostIDs.slice(0, Config.CACHE_INITIAL_LOAD)).then(currentPosts => {
					this.setState({
						currentPostIDs,
						currentPosts,
						postSource: this.dataSource.cloneWithRows(currentPosts)
					})
				})
			}
		})

		if(this.props.isOnline){
			try {
				this.props.isLoading(true);
				var locationPosts = await Functions.timeout(fetch(`${Config.SERVER}/api/posts/getLocationPosts?token=${this.props.user.token}&placeID=${this.props.location.RowKey}`).then(response => response.json()));
				var posts = await CacheEngine.loadPosts(locationPosts.data.slice(0, Config.CACHE_INITIAL_LOAD), this.props.location.RowKey, this.props.location.Name);

				this.setState({
					currentPostIDs: locationPosts.data,
					currentPosts: posts,
					postSource: this.dataSource.cloneWithRows(posts),
					hasLoaded: true
				})
				this.props.isLoading(false);
				AsyncStorage.setItem('@Location:' + this.props.location.RowKey, JSON.stringify(locationPosts.data));
			} catch(error) {
				ToastAndroid.show('An error occurred while loading posts. Please try again.', ToastAndroid.LONG);
				this.props.isLoading(false);
				this.props.user.tracker.trackException(`SL-${JSON.stringify(error)}`, false);
			}
		}
		CacheEngine.addInterestLocation(this.props.location);
	}

	async scrollLoad(){
		var currentLevel = this.state.currentPosts.length;

		if(!this.props.isLoading() && currentLevel<this.state.currentPostIDs.length){
			this.props.isLoading(true);

			var postsToLoad = this.state.currentPostIDs.slice(currentLevel, currentLevel + Config.CACHE_INITIAL_LOAD);
			try{
				var newPosts = null;
				if(this.props.isOnline){
					newPosts = await CacheEngine.loadPosts(postsToLoad, this.props.location.RowKey, this.props.location.Name);
				} else {
					newPosts = await CacheEngine.loadFromCache(postsToLoad);
				}

				var currentPosts = this.state.currentPosts.concat(newPosts);
				this.setState({
					currentPosts,
					postSource: this.dataSource.cloneWithRows(currentPosts)
				})
				this.props.user.tracker.trackEvent('app', 'scrollLoad', {value: currentLevel});
			} catch (error){
				ToastAndroid.show('An error occurred while loading more posts', ToastAndroid.LONG);
				this.props.user.tracker.trackException(`LSL-${JSON.stringify(error)}`, false);
			} finally {
				this.props.isLoading(false);
			}
		}
	}

	actionSelected(pos){
		this.props.isLoading(false);
		if(!this.props.isOnline){
			ToastAndroid.show('You are offline. Please check your internet connection and try again', ToastAndroid.LONG);
			return;
		}

		if(!this.props.user.location){
			ToastAndroid.show('Error: Location unavailable', ToastAndroid.LONG);
			return;
		}

		this.props.navigator.push({
			screen: 'addPost',
			location: this.props.location,
			addPost: post => {
				this.state.currentPosts.unshift(post);
				this.state.currentPostIDs.unshift(post.RowKey);
				this.setState({
					postSource: this.dataSource.cloneWithRows(this.state.currentPosts)
				})
				this.props.addPost(post);
			},
			onLocation: this.props.onLocation
		})
	}

	updatePost(index, post){
		this.state.currentPosts[index] = Object.assign(this.state.currentPosts[index], post);
	}
}