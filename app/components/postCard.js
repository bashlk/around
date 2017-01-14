import React, { Component } from 'react';
import {View, Text, Image, TouchableNativeFeedback, ToastAndroid} from 'react-native';
import Functions from '../components/functions.js';
import CacheEngine from '../components/cacheEngine.js';

export default class PostCard extends Component {
	constructor(props){
		super(props);
	}

	componentWillMount(){
		this.state = {
			BoostCount: this.props.post.BoostCount,
			Boosted: this.props.post.Boosted
		}
	}

	componentWillReceiveProps(){
		this.state = {
			BoostCount: this.props.post.BoostCount,
			Boosted: this.props.post.Boosted
		}
	}

	render(){
		return(
			<TouchableNativeFeedback onPress={this.showPost.bind(this, this.props.post)} background={TouchableNativeFeedback.Ripple('#F8BBD0')}>
				<View style={{backgroundColor: '#F5F5F5', margin: 5, padding: 10, elevation: 1}}>
					{this.props.showLocation &&
					<Text style={{fontWeight: 'bold', color: '#989898', alignSelf: 'center'}}>{this.props.post.LocationName}</Text>
					}
					
					<View style={{flex: 1, flexDirection: 'row'}}>
						<Text style={{flex: 1, fontWeight: 'bold', color: '#E91E63'}}>{this.props.post.Username}</Text>
						<Text style={{flex: 1, textAlign: 'right'}}>{Functions.timeDifference(this.props.post.PostTimestamp)}</Text>
					</View>

					<View style={{flex: 1, flexDirection: 'column', marginTop: 2}}>
						<Text>{this.props.post.Message}</Text>
					</View>

					{this.props.post.HasAttachment &&
						<View style={{marginTop: 5}}>
							<Image style={{height: 200}} source={{uri: 'https://aroundapp.blob.core.windows.net/posts/' + this.props.post.RowKey}} resizeMode={'cover'}/>
						</View>
					}

					<View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 5}}>
						<View style={{flexDirection: 'row'}}>
							<Image style={{width: 20, height: 20, tintColor: '#707070'}} source={require('../images/comment_icon.png')} />
							<Text>{this.props.post.CommentCount}</Text>
						</View>

						<TouchableNativeFeedback onPress={this.boost.bind(this, this.state.Boosted)} background={TouchableNativeFeedback.Ripple('#F8BBD0', true)}>
							<View style={{flexDirection: 'row', borderRadius: 50}}>	
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
			updatePost: post => {
				this.prop.updatePost(post);
			}
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
}