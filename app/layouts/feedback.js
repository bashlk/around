import React, { Component } from 'react';
import {View, Text, TextInput, ToolbarAndroid, Button, ToastAndroid } from 'react-native';
import Config from '../components/config.js';
import Functions from '../components/functions.js';

export default class Feedback extends Component {
	constructor(props){
		super(props);
		this.state = {
			message: ''
		}
	}

	render() {
		return (
		<View style={{flex: 1, backgroundColor: 'white'}}>
			<ToolbarAndroid style={{height: 50, backgroundColor: '#E91E63'}} title="Send feedback" titleColor="white" navIcon={{uri: 'ic_arrow_back_white_24dp'}} onIconClicked={()=>{this.props.navigator.pop()}}/>
			<View style={{padding: 10}}>
				<Text>Thank you for leaving feedback on Around. If you are reporting an issue with the app, please describe how the issue occured with as much detail as possible.</Text>
				<TextInput style={{textAlignVertical: 'top', marginTop: 10}} multiline={true} numberOfLines={6} underlineColorAndroid={'#E91E63'} selectionColor={'#F8BBD0'} onChangeText={(message) => this.setState({message})} autoFocus={true}/>
				<Button onPress={this.sendFeedback.bind(this)} title="Send feedback" color="#E91E63"/>
			</View>
		</View>
		)
	}

	sendFeedback(){
		if(this.state.message.length > 0){
			Functions.timeout(fetch(Config.SERVER + '/api/users/addFeedback', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					token: this.props.user.token,
					message: this.state.message
				})
			})).then(()=>{
				ToastAndroid.show('Thank you for your feedback', ToastAndroid.LONG);
				this.props.user.tracker.trackEvent('app', 'feedback');
			}).catch((error)=>{
				ToastAndroid.show('An error occured while sending your feedback', ToastAndroid.LONG);
				this.props.user.tracker.trackException(`SF-${JSON.stringify(error)}`, false);
			})
			this.props.navigator.pop();
		}
	}
}