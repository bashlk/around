import React, { Component } from 'react';
import {View, Text, Image, TouchableNativeFeedback, ToastAndroid} from 'react-native';
import Functions from '../components/functions.js';
import CacheEngine from '../components/cacheEngine.js';

export default class PostCard extends Component {
	componentWillMount(){
		this.state = {
			BoostCount: this.props.post.BoostCount,
			Boosted: this.props.post.Boosted,
		}
	}

	componentWillReceiveProps(nextProps){
		this.state = {
			BoostCount: nextProps.post.BoostCount,
			Boosted: nextProps.post.Boosted
		}
	}

	render(){
		return(
			<TouchableNativeFeedback onPress={this.showPost.bind(this, this.props.post)}>
				<View style={{backgroundColor: '#F5F5F5', margin: 5, padding: 10, elevation: 1}}>
					{this.props.showLocation &&
						<TouchableNativeFeedback onPress={this.showLocation.bind(this, {RowKey: this.props.post.PartitionKey, Name: this.props.post.LocationName})}>
							<View style={{alignSelf: 'center'}}>
								<Text style={{fontWeight: 'bold', color: '#989898'}}>{this.props.post.LocationName}</Text>
							</View>
						</TouchableNativeFeedback>
					}
					
					
					<View style={{flex: 1, flexDirection: 'row'}}>
						<TouchableNativeFeedback onPress={this.showProfile.bind(this, this.props.post.Username)}>
							<View>
								<Text style={{fontWeight: 'bold', color: '#E91E63'}}>{this.props.post.Username}</Text>
							</View>
						</TouchableNativeFeedback>
						<Text style={{flex: 1, textAlign: 'right'}}>{Functions.timeDifference(this.props.post.PostTimestamp)}</Text>
					</View>

					<View style={{flex: 1, flexDirection: 'column', marginTop: 2}}>
						<Text>{this.props.post.Message}</Text>
					</View>

					{this.props.post.HasAttachment &&
						<TouchableNativeFeedback onPress={()=>{this.props.navigator.push({screen: 'showImage', rowKey: this.props.post.RowKey})}}>
							<View style={{marginTop: 5}}>
								<Image style={{height: 200}} source={{uri: 'https://aroundapp.blob.core.windows.net/posts/' + this.props.post.RowKey}} resizeMode={'cover'}/>
							</View>
						</TouchableNativeFeedback>
					}

					<View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 5}}>
						<View style={{flexDirection: 'row'}}>
							{this.props.post.OnLocation &&
							<Image style={{width: 20, height: 20, tintColor: '#707070'}} source={require('../images/onlocation_icon.png')} />
							}
							<Image style={{width: 20, height: 20, tintColor: '#707070'}} source={require('../images/comment_icon.png')} />
							<Text>{this.props.post.CommentCount}</Text>

						</View>

						<TouchableNativeFeedback onPress={this.boost.bind(this, this.state.Boosted)}>
							<View style={{flexDirection: 'row'}}>	
								<Text>{this.state.BoostCount}</Text>
								<Image style={{width: 20, height: 20, tintColor: this.state.Boosted ? '#E91E63' : '#707070'}} source={require('../images/upvote_icon.png')} />
							</View>
						</TouchableNativeFeedback>
					</View>
				</View>
			</TouchableNativeFeedback>
		)
	}

	showPost(){
		this.props.navigator.push({
			screen: 'showPost',
			post: this.props.post,
			updatePost: this.props.updatePost
		})
	}

	boost(boosted){
		if(!boosted){
			this.setState({
				Boosted: true,
				BoostCount: ++this.state.BoostCount
			})

			var post = {
				RowKey: this.props.post.RowKey,
				PlaceID: this.props.post.PartitionKey,
				Boosted: true,
				BoostCount: this.state.BoostCount
			}

			CacheEngine.boost(post).then(()=>{
				this.props.updatePost(post);
			}).catch((error)=>{
				ToastAndroid.show("Couldn't contact server to boost post", ToastAndroid.LONG);
				this.setState({
					Boosted: false,
					BoostCount: --this.state.BoostCount
				})
			})
		}
	}

	showLocation(location){
		this.props.navigator.push({
			screen: 'showLocation',
			location: location,
			addPost: this.props.addPost,
			onLocation: true
		})
	}

	showProfile(username){
      this.props.navigator.push({
        screen: 'profile',
        profileName: username
      })
 	}
}