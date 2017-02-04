import React, { Component } from 'react';
import { View, Text, Image, ListView, TextInput, ActivityIndicator, ToastAndroid, TouchableNativeFeedback, ToolbarAndroid} from 'react-native';

import Functions from '../components/functions.js';
import CacheEngine from '../components/cacheEngine.js';
const dismissKeyboard = require('dismissKeyboard');

export default class ShowPost extends Component {
	constructor(props){
		super(props);
		this.dataSource = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
		this.state = {
			displayComments: false,
			isLoading: false,
			comment: ''
		}
	}

	render() {
		return(
			<View style={{flex: 1, backgroundColor: 'white', justifyContent: 'space-between'}}>
				<ToolbarAndroid style={{height: 50, backgroundColor: '#E91E63'}} titleColor="white" title={this.props.post.LocationName} navIcon={{uri: 'ic_arrow_back_white_24dp'}} onIconClicked={()=>{this.props.navigator.pop()}}/>

				<View style={{flex: 1, padding: 10}}>
					<View style={{flexDirection: 'row'}}>
						<TouchableNativeFeedback onPress={this.showProfile.bind(this, this.props.post.Username)}>
							<View style={{flex: 1}}>
								<Text style={{fontWeight: 'bold', color: '#E91E63'}}>{this.props.post.Username}</Text>
							</View>
						</TouchableNativeFeedback>
						<Text style={{flex: 1, textAlign: 'right'}}>{Functions.timeDifference(this.props.post.PostTimestamp)}</Text>
					</View>

					<View style={{flexDirection: 'column', marginTop: 2}}>
						<Text>{this.props.post.Message}</Text>
					</View>

					{this.props.post.HasAttachment &&
						<TouchableNativeFeedback onPress={()=>{this.props.navigator.push({screen: 'showImage', rowKey: this.props.post.RowKey})}}>
							<View style={{marginTop: 5}}>
								<Image style={{height: 200}} source={{uri: 'https://aroundapp.blob.core.windows.net/posts/' + this.props.post.RowKey}} resizeMode={'cover'}/>
							</View>
						</TouchableNativeFeedback>
					}

					<Text style={{fontWeight: 'bold', marginTop: 5}}>Comments</Text>
					{this.props.post.CommentCount==0 &&
						<Text style={{textAlign: 'center'}}>No comments yet</Text>
					}

					{!this.props.isOnline && this.props.post.CommentCount > 0 && !this.props.post.Comments &&
						<Text style={{textAlign: 'center'}}>Unable to load comments</Text>
					}

					{this.state.displayComments &&
						<ListView dataSource={this.state.comments} renderRow={this.renderComment.bind(this)}/>
					}

					{this.state.isLoading &&
						<View style={{alignItems: 'center'}}>
							<ActivityIndicator styleAttr="Small" color="#F48FB1"/>
						</View>
					}
				</View>

				{this.props.isOnline &&
				<View style={{height: 45, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, backgroundColor: 'white'}}>
					<TextInput style={{flex: 1}} placeholder={'Type your comment here'} onChangeText={(comment) => this.setState({comment})} value={this.state.comment}/>
					<TouchableNativeFeedback onPress={this.addComment.bind(this)}>
						<View style={{height: 35, width: 35, borderRadius: 35, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center'}}>
							<Image style={{width: 20, height: 20}} source={require('../images/send_icon.png')} />
						</View>
					</TouchableNativeFeedback>
				</View>
				}
			</View>
		)
	}

	renderComment(comment){
		return (
			<View>
				<View style={{flexDirection: 'row'}}>
					<TouchableNativeFeedback onPress={this.showProfile.bind(this, comment.Username)}>
						<View style={{flex: 1}}>
							<Text style={{fontWeight: 'bold', color: '#E91E63'}}>{comment.Username}</Text>
						</View>
					</TouchableNativeFeedback>
					<Text style={{flex: 1, textAlign: 'right'}}>{Functions.timeDifference(comment.Timestamp)}</Text>
				</View>

				<View style={{flexDirection: 'column', marginTop: 2}}>
					<Text>{comment.Comment}</Text>
				</View>
			</View>
		)
	}

	componentDidMount(){
		if(this.props.post.CommentCount>0){
			if(this.props.post.Comments){
				this.setState({
					comments: this.dataSource.cloneWithRows(this.props.post.Comments),
					displayComments: true
				})
			}

			if(this.props.isOnline){
				this.setState({
					isLoading: true
				})
				CacheEngine.getComments(this.props.post).then((comments)=>{
					this.props.post.CommentCount = comments.length;
					this.props.post.Comments = comments;

					this.setState({
						comments: this.dataSource.cloneWithRows(comments),
						displayComments: true,
						isLoading: false
					})
					this.props.updatePost(this.props.post);
				}).catch((error)=>{
					ToastAndroid.show('Couldn\'t contact server to retrieve comments', ToastAndroid.LONG);
					this.setState({
						isLoading: false
					})
					this.props.user.tracker.trackException(`LC-${JSON.stringify(error)}`, false);
				})
			}
		}
	}

	async addComment(){
		if(this.state.comment.length>0){
			var comment = {
				Username: this.props.user.username,
				Comment: this.state.comment,
				Timestamp: new Date().toISOString()

			}
			if(!this.props.post.Comments){
				this.props.post.Comments = [];
			}
			this.props.post.Comments.push(comment);
			this.props.post.CommentCount++;

			this.setState({
				comments: this.dataSource.cloneWithRows(this.props.post.Comments),
				displayComments: true,
				comment: ''
			})
			dismissKeyboard();
			
			var post = {
				RowKey: this.props.post.RowKey,
				PlaceID: this.props.post.PartitionKey,
				Comments: this.props.post.Comments,
				CommentCount: this.props.post.CommentCount
			}

			CacheEngine.addComment(post, this.state.comment).then(()=>{
				this.props.updatePost(this.props.post);
			}).catch((error)=>{
				ToastAndroid.show('An error occurred while posting your comment', ToastAndroid.LONG);
				this.props.post.Comments.pop();
				this.props.post.CommentCount--;
				this.setState({
					comments: this.dataSource.cloneWithRows(this.props.post.Comments)
				})
				this.props.user.tracker.trackException(`AC-${JSON.stringify(error)}`, false);
			})
		}
	}

	showProfile(username){
      this.props.navigator.push({
        screen: 'profile',
        profileName: username
      })
 	}
}