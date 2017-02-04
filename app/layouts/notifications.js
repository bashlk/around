import React, { Component } from 'react';
import {View, Text, ListView, ToolbarAndroid, TouchableNativeFeedback, AsyncStorage} from 'react-native';
import CacheEngine from '../components/cacheEngine.js';

export default class Notifications extends Component {
	constructor(props) {
		super(props);
		this.dataSource = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
		this.state = {
			notifications: []
		}
	}

	render() {
		return(
			<View style={{flex: 1, backgroundColor: 'white', paddingBottom: 10}}>
				<ToolbarAndroid style={{height: 50, backgroundColor: '#E91E63'}} titleColor="white" title='Notifications' navIcon={{uri: 'ic_arrow_back_white_24dp'}} onIconClicked={()=>{this.props.navigator.pop()}}/>
				{this.state.notifications.length > 0 &&
				<ListView
					dataSource={this.state.notificationSource}
					renderRow={this.renderNotification.bind(this)}
				/>
				}
				{this.state.notifications.length==0 &&
					<Text style={{textAlign: 'center'}}>No notifications</Text>
				}
			</View>
		)
	}

	renderNotification(notif, secID, rowID){
		return (
			<TouchableNativeFeedback onPress={this.showPost.bind(this, notif)}>
				<View style={{backgroundColor: rowID < this.props.user.notifications.current ? '#FCE4EC' : '#F5F5F5', padding: 5, margin: 1}}>
					<Text>{notif.message}</Text>
				</View>
			</TouchableNativeFeedback>
		)
	}

	async componentDidMount() {
		var loadOperations = [];

		this.props.user.notifications.data.forEach(notif => {
			if(notif.Message){
				loadOperations.push({isMessage: true, message: notif.Message})
			} else {
				loadOperations.push(
					CacheEngine.loadSingle(notif.RowKey).then(post => {
						var message = `${notif.Users[0]}${notif.Users.length > 1 ? ' and ' + (notif.Users.length - 1) + ' ' + ((notif.Users.length - 1) > 1 ? 'others' : 'other person'): ''} commented on the post "${post.Message.substring(0, 50)}${post.Message.length>=50 ? '...': ''}"`
						return {post, message};
					})
				)
			}
		})

		Promise.all(loadOperations).then(notifications=>{
			this.setState({
				notifications,
				notificationSource: this.dataSource.cloneWithRows(notifications)
			})
			
			this.props.user.notifications.current = 0;
			this.props.user.notifications.lastsync = new Date().toISOString();
			AsyncStorage.mergeItem('@User', JSON.stringify({notifications: this.props.user.notifications}));
		})
	}

	showPost(notif){
		if(!notif.isMessage){
			this.props.navigator.push({
				screen: 'showPost',
				post: notif.post,
				updatePost: ()=>{
				//what happens when you don't plan, run out of scope and 
				//don't give a shit anymore apart from finishing this damn thing
				}
			})
		}
	}
}