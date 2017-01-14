import React, { Component } from 'react';
import { View, Text, Image, TextInput, TouchableHighlight, TouchableNativeFeedback, Alert} from 'react-native';
import Spinner from 'react-native-loading-spinner-overlay';
import Config from '../components/config.js';
import Functions from '../components/functions.js';

export default class Login extends Component {
	constructor(props){
		super(props);
		this.state = {username: '', password: '', isLoading: false};
	}

	render() {
		return(
			<View style={{flex: 1, backgroundColor: '#E91E63',padding: 20}}>
				<View style={{flex: 3, flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
					<Image style={{width: 150, height: 150}} source={require('../images/logo.png')}/>
					<Text style={{color: 'white', textAlign: 'center', fontSize: 24}}>Around</Text>
					<Text style={{color: 'white'}}>Alpha 2</Text>
				</View>	
				<View style={{flex: 2}}>
					<TextInput style={{backgroundColor: 'white', height: 40}} underlineColorAndroid='transparent' placeholder='Username' onChangeText={(username) => this.setState({username})}/>
					<TextInput style={{backgroundColor: 'white', height: 40, marginTop: 10}} underlineColorAndroid='transparent' placeholder='Password' secureTextEntry={true} onChangeText={(password) => this.setState({password})}/>

					<View style={{flex: 1, marginTop: 10, alignItems: 'center'}}>
						<TouchableHighlight onPress={this.onRegister.bind(this)} underlayColor={'white'}>
							<Text style={{color: 'white', textDecorationLine: 'underline'}}>Create new account</Text>
						</TouchableHighlight>
					</View>
				</View>	
				<View style={{flex: 1, flexDirection: 'row', justifyContent: 'center'}}>
					<TouchableNativeFeedback onPress={this.validate.bind(this)} background={TouchableNativeFeedback.Ripple('#E91E63')}>
						<View style={{height: 40, width: 100, backgroundColor: '#C2185B', justifyContent: 'center', elevation: 2}}>
							<Text style={{color: 'white', textAlign: 'center', fontSize: 20}}>Login</Text>
						</View>
					</TouchableNativeFeedback>
				</View>
				<Spinner visible={this.state.isLoading} />
			</View>
		)
	}

	onRegister(){
		this.props.navigator.push({
			screen: 'register'
		})
	}

	validate(){
		if(!(this.state.username.length>0 && this.state.password.length>0)){
			Alert.alert('Error', 'Please enter your username and password to continue.');
			return;
		}

		var uRegex =  /^[a-z0-9._]+$/i;
		if(!(uRegex.test(this.state.username))){
			Alert.alert('Error', 'Invalid username. Please check your username and try again.');
			return;
		}

		this.login.call(this);
	}

	login(){
		if(this.props.isOnline){
			this.setState({isLoading: true});
			Functions.timeout(fetch(Config.SERVER + '/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: this.state.username,
					password: this.state.password})
			})).then(response => response.json()).then(result => {
				this.setState({isLoading: false});
				if(result.error){
					Alert.alert('Error', result.error);
				} else {
					var user = {
						token:  result.Token,
						username: this.state.username.toLowerCase(),
						points: 0,
						newPoints: result.Points,
						level: Functions.calculateLevel(result.Points)
					}
					this.props.onLogin(user);
					this.props.navigator.resetTo({
						screen: 'feed'
					})
				}
			}).catch(error => {
				this.setState({isLoading: false});
				if(error.message=="timeout"){
					Alert.alert('Error', 'Server unavailable. Please try again later.');
				}
			})
		} else {
			Alert.alert('Error', 'You are offline. Please check your internet connection and try again.');
		}
	}
}