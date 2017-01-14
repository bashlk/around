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
			actions: []
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

						{this.state.currentPosts.length == 0 && !this.props.isLoading() &&
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
		this.props.isLoading(true);
		AsyncStorage.getItem('@Location:' + this.props.location.PlaceID).then(currentPostIDs => {
			if(currentPostIDs){
				currentPostIDs = JSON.parse(currentPostIDs);
				CacheEngine.loadFromCache(currentPostIDs.slice(0, Config.CACHE_INITIAL_LOAD)).then(currentPosts => {
					this.setState({
						currentPosts,
						postSource: this.dataSource.cloneWithRows(currentPosts)
					})
				})
			}
		})

		try {
			var locationPosts = await Functions.timeout(fetch(`${Config.SERVER}/api/posts/getLocationPosts?token=${this.props.user.token}&placeID=${this.props.location.PlaceID}`).then(response => response.json()));
			var posts = await CacheEngine.loadPosts(locationPosts.data.slice(0, Config.CACHE_INITIAL_LOAD), this.props.location.PlaceID);

			this.setState({
				currentPostIDs: locationPosts.data,
				currentPosts: posts,
				postSource: this.dataSource.cloneWithRows(posts),
			})
			this.props.isLoading(false);
			AsyncStorage.setItem('@Location:' + this.props.location.PlaceID, JSON.stringify(locationPosts.data));
		} catch(error) {
			console.log(error);
			ToastAndroid.show('An error occurred while loading posts. Please try again.', ToastAndroid.LONG);
			this.props.isLoading(false);
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
				postSource: this.dataSource.cloneWithRows(currentPosts)
			})
			this.props.isLoading(false);
		}
	}

	actionSelected(pos){
		this.props.isLoading(false);
		this.props.navigator.push({
			screen: 'addPost',
			locations: [this.props.location],
			addPost: post => {
				this.state.currentPosts.unshift(post);
				this.state.currentPostIDs.unshift(post.RowKey);
				this.setState({
					postSource: this.dataSource.cloneWithRows(this.state.currentPosts)
				})
				if(this.props.addPost){
					this.props.addPost(post);
				}
			}
		})
	}

	updatePost(index, post){
		this.state.currentPosts[index] = Object.assign(this.state.currentPosts[index], post);
	}
}