import React, { Component } from 'react';
import { View, Text, Image, TextInput, TouchableNativeFeedback, StatusBar, StyleSheet, Alert} from 'react-native';
import Spinner from 'react-native-loading-spinner-overlay';
import Config from '../components/config.js';
import Functions from '../components/functions.js';

export default class Register extends Component {
	constructor(props){
		super(props);
		this.state = {username: '', password: '', email: '', isLoading: false};
	}

	render() {
		return(
		<View style={{flex: 1, backgroundColor: '#E91E63',padding: 20}}>
			<View style={{flex: 1}}>
				<Text style={{color: 'white', textAlign: 'center', fontSize: 20}}>You are one step away from being around!</Text>
			</View>

			<View style={{flex: 4}}>
				<Text style={{color: 'white'}}>Please fill in all details below</Text>
				<TextInput style={{backgroundColor: 'white', height: 40, marginTop: 10}} underlineColorAndroid='transparent' placeholder='Username' onChangeText={(username) => this.setState({username})}/>
				<TextInput style={{backgroundColor: 'white', height: 40, marginTop: 10}} underlineColorAndroid='transparent' placeholder='Email' onChangeText={(email) => this.setState({email})}/>
				<TextInput style={{backgroundColor: 'white', height: 40, marginTop: 10}} underlineColorAndroid='transparent' placeholder='Password' secureTextEntry={true} onChangeText={(password) => this.setState({password})}/>

				<View style={{flexDirection: 'row', justifyContent: 'center', marginTop: 20}}>
				<TouchableNativeFeedback background={TouchableNativeFeedback.Ripple('#E91E63')} onPress={this.validate.bind(this)}>
					<View style={{height: 40, width: 100, backgroundColor: '#C2185B', justifyContent: 'center', elevation: 2}}>
						<Text style={{color: 'white', textAlign: 'center', fontSize: 20}}>Register</Text>
					</View>
				</TouchableNativeFeedback>
				</View>
			</View>
			<Spinner visible={this.state.isLoading} />
		</View>	
		)
	}

	validate(){
		if(!(this.state.username.length>0 && this.state.password.length>0 && this.state.email.length>0)){
			Alert.alert('Error', 'Please complete all fields before continuing');
			return;
		}

		var uRegex =  /^[a-z0-9._]+$/i;
		if(!(uRegex.test(this.state.username))){
			Alert.alert('Error', 'Invalid username. Usernames cannot contain @');
			return;
		}

		var eRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		if(!(eRegex.test(this.state.email))){
			Alert.alert('Error', 'Invalid email. Please check again');
			return;
		}

		this.login.call(this);
	}

	login(){
		if(this.props.isOnline){
			this.setState({isLoading: true});
			Functions.timeout(fetch(Config.SERVER + '/auth/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: this.state.username,
					password: this.state.password,
					email: this.state.email})
			})).then(response => response.json()).then(result => {
				this.setState({isLoading: false});
				if(result.error){
					Alert.alert('Error', result.error);
				} else {
					var user = {
						token:  result.Token,
						username: this.state.username.toLowerCase(),
						points: 0,
						newPoints: 5,
						level: Functions.calculateLevel(5)
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