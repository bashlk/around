import React, { Component } from 'react';
import { AppRegistry, Navigator, View, StatusBar, BackAndroid, AsyncStorage, Text, ActivityIndicator, Dimensions, NetInfo, TouchableNativeFeedback, ToastAndroid} from 'react-native';
import ProgressBar from 'react-native-progress/Bar';
import LocationServicesDialogBox from "react-native-android-location-services-dialog-box";
import Functions from './app/components/functions.js';
import BackgroundJob from 'react-native-android-job';
import PushNotification from 'react-native-push-notification';
import {  GoogleAnalyticsTracker, GoogleAnalyticsSettings } from 'react-native-google-analytics-bridge';

import Config from './app/components/config.js';
import Login from './app/layouts/login.js';
import Register from './app/layouts/register.js';
import Feed from './app/layouts/feed.js';
import AddPost from './app/layouts/addPost.js';
import ShowPost from './app/layouts/showPost.js';
import ShowLocation from './app/layouts/showLocation.js';
import AddLocation from './app/layouts/addLocation.js';
import Profile from './app/layouts/profile.js';
import Search from './app/layouts/search.js';
import Locations from './app/layouts/locations.js';
import Notifications from './app/layouts/notifications.js';
import ShowImage from './app/layouts/showImage.js';
import Wizard from './app/layouts/wizard.js';
import Feedback from './app/layouts/feedback.js';

var viewNavigator = null, initialRouteStack = null;
//GoogleAnalyticsSettings.setDryRun(true);
var tracker = new GoogleAnalyticsTracker(Config.GTRACKER_ID);

BackAndroid.addEventListener('hardwareBackPress', () => {
	if (viewNavigator.getCurrentRoutes().length === 1) {
		return false;
	}
	viewNavigator.pop();
	return true;
});

BackgroundJob.register(()=> {
	PushNotification.cancelAllLocalNotifications();
	AsyncStorage.multiGet(['@User', '@User:InterestPosts', '@User:InterestLocations']).then(data=>{
		var user = JSON.parse(data[0][1]), interestPosts = JSON.parse(data[1][1]), interestLocations = JSON.parse(data[2][1]);

		if(interestLocations){
			var locationsToGet = [];
			var locationMap = new Map(interestLocations);
			interestLocations.forEach(location => {
				locationsToGet.push({
					placeID: location[0],
					lastSync: location[1].lastSync
				})
			})

			fetch(`${Config.SERVER}/api/locations/getLocationActivity?token=${user.token}&locations=${JSON.stringify(locationsToGet)}`).then(response => response.json()).then(response => {
				response.data.sort((a, b)=>b.Activity - a.Activity);
				var topLocation = response.data[0];
				topLocation.Name = locationMap.get(topLocation.RowKey).name;
				if(topLocation.Activity > 0){
					PushNotification.localNotification({
						message: `${topLocation.Activity} new messages have been posted in ${topLocation.Name}`,
						color: '#E91E63',
						tag: JSON.stringify({RowKey: topLocation.RowKey, Name: topLocation.Name}),
						playSound: false,
						vibrate: false
					})
				}
			}).catch((error)=> {
				//Silently ignore error
			})
		}
		
		if(interestPosts){
			var postsToGet = [];
			interestPosts.forEach(post => {
				postsToGet.push(post[0]);
			})

			fetch(`${Config.SERVER}/api/posts/getPostActivity?token=${user.token}&posts=${JSON.stringify(postsToGet)}&lastsync=${user.notifications.lastsync}`).then(response => response.json()).then(response => {
				if(response.data.length > 0){
					PushNotification.localNotification({
						message: `You have ${response.data.length} new ${response.data.length>1 ? 'notifications' : 'notification'}`,
						color: '#E91E63',
						tag: 'notification',
						playSound: false,
						vibrate: false
					})
				}
			}).catch((error)=> {
				//Silently ignore error
			})
		}
	})
})

PushNotification.configure({
	onNotification: function(notif) {
		initialRouteStack = [{screen: 'feed'}];
		if(notif.tag == 'notification'){
			tracker.trackEvent('app', 'open', {label: 'notification'});
		} else {
			var location = JSON.parse(notif.tag);
			initialRouteStack.push({
				screen: 'showLocation', 
				location,
				addPost: ()=>{},
				onLocation: false
			})
			tracker.trackEvent('app', 'open', {label: 'location'});
		}

		if(viewNavigator){
			viewNavigator.immediatelyResetRouteStack(initialRouteStack);
		}
	}
})

export default class Round extends Component {
	constructor(props){
		super(props);
		this.state = {
			initialRouteStack: false,
			isLoading: false,
			isOnline: false,
			user: false,
			triedLocation: false,
			currentScreen: null,
			showProfile: false
		}

		this.handleNetworkState = () =>{
			NetInfo.isConnected.fetch().then(isOnline =>{
				this.setState({isOnline});
			})
		}
	}

	render() {
		return (
			<View style={{flex: 1}}>
			<StatusBar backgroundColor="#880E4F" barStyle="light-content" />
			{this.state.initialRouteStack &&
				<Navigator ref={(nav)=>{viewNavigator = nav;}} initialRouteStack={this.state.initialRouteStack} configureScene={this.configureScene} onWillFocus={this.trackScreen.bind(this)} onDidFocus={this.resetScreen.bind(this)} renderScene={(route, viewNavigator) => {
					switch(route.screen){
						case 'login':
							return <Login navigator={viewNavigator} onLogin={this.onLogin.bind(this)} isOnline={this.state.isOnline}/>;
							break;
						case 'register':
							return <Register navigator={viewNavigator} onLogin={this.onLogin.bind(this)} isOnline={this.state.isOnline}/>;
							break;
						case 'feed':
							return <Feed navigator={viewNavigator} user={this.state.user} isLoading={this.setLoading.bind(this)} isOnline={this.state.isOnline} refreshLocation={this.getLocation.bind(this)}/>;
							break;
						case 'addPost':
							return <AddPost navigator={viewNavigator} user={this.state.user} location={route.location} addPost={route.addPost} onLocation={route.onLocation}/>;
							break;
						case 'showPost':
							return <ShowPost navigator={viewNavigator} user={this.state.user} post={route.post} isOnline={this.state.isOnline} updatePost={route.updatePost}/>
							break;
						case 'showLocation':
							return <ShowLocation navigator={viewNavigator} user={this.state.user} location={route.location} isOnline={this.state.isOnline} isLoading={this.setLoading.bind(this)} addPost={route.addPost} onLocation={route.onLocation}/>
							break;
						case 'addLocation':
							return <AddLocation navigator={viewNavigator} user={this.state.user} isOnline={this.state.isOnline} addPost={route.addPost} addLocation={route.addLocation}/>
							break;
						case 'profile':
							return <Profile navigator={viewNavigator} user={this.state.user} isOnline={this.state.isOnline} isLoading={this.setLoading.bind(this)} profileName={route.profileName}/>
							break;
						case 'search':
							return <Search navigator={viewNavigator} user={this.state.user} isLoading={this.setLoading.bind(this)} isOnline={this.state.isOnline}/>
							break;
						case 'locations':
							return <Locations navigator={viewNavigator} user={this.state.user} isOnline={this.state.isOnline} locations={route.locations} addPost={route.addPost} addLocation={route.addLocation}/>
							break;
						case 'notifications':
							return <Notifications navigator={viewNavigator} user={this.state.user} isLoading={this.setLoading.bind(this)}/>
							break;
						case 'showImage':
							return <ShowImage navigator={viewNavigator} rowKey={route.rowKey} />
							break;
						case 'wizard':
							return <Wizard navigator={viewNavigator} style={route.style} stages={route.stages} nextScreen={route.nextScreen} showTitle={route.showTitle}/>
							break;
						case 'feedback':
							return <Feedback navigator={viewNavigator} user={this.state.user} />
							break;
					}
				}}
				/>}

				{this.state.showProfile && this.state.triedLocation && !this.state.user.location && this.state.isOnline &&
					<TouchableNativeFeedback onPress={this.getLocation.bind(this)}>
						<View style={{height: 20, backgroundColor: 'red', justifyContent: 'center'}}>
							<Text style={{color: 'white', textAlign:'center', fontSize: 11}}>Failed to get location. Tap here to retry</Text>
						</View>
					</TouchableNativeFeedback>
				}

				{this.state.showProfile && !this.state.triedLocation && !this.state.user.location && this.state.isOnline && 
					<View style={{height: 25, flexDirection: 'row', backgroundColor: 'orange', justifyContent: 'center', alignItems: 'center', paddingVertical: 5}}>
						<ActivityIndicator styleAttr="Small" color="white"/>
						<Text style={{color: 'white', textAlign:'center', fontSize: 11, marginLeft: 5}}>Getting location</Text>
					</View>
				}

				{this.state.showProfile && !this.state.isOnline &&
					<View style={{height: 20, backgroundColor: 'red', justifyContent: 'center'}}>
						<Text style={{color: 'white', textAlign:'center', fontSize: 11}}>You are offline. Showing previously retrieved content</Text>
					</View>
				}

				{this.state.showProfile && 
					<TouchableNativeFeedback onPress={this.showProfile.bind(this)}>
					<View style={{height: 20, flexDirection: 'row', backgroundColor: '#E91E63', alignItems: 'center', paddingHorizontal: 10}}>
					<Text style={{color: 'white', fontWeight: 'bold'}}>{this.state.user.username}</Text>
					<Text style={{color: 'white', marginLeft: 5}}>Level {this.state.user.level.level}</Text>
					<ProgressBar style={{flex: 1, marginHorizontal: 3, marginTop: 2}} progress={this.state.user.level.progress} borderRadius={0} color='white' borderColor='#E91E63' unfilledColor='#AD1457'/>
					<Text style={{color: 'white', marginLeft: 5}}>{this.state.user.points} + {this.state.user.newPoints} pts</Text>
					</View>
					</TouchableNativeFeedback>
				}

				{this.state.isLoading &&
					<View style={{position: 'absolute', top: 60, right: 0, width: Dimensions.get('window').width, alignItems: 'center'}}>
					<View style={{backgroundColor: 'white', borderRadius: 50, padding: 5, elevation: 1}}>
					<ActivityIndicator styleAttr="Small" color="#F48FB1"/>
					</View>
					</View>
				}
				</View>
			);
		}

	setLoading(isLoading){
		if(arguments.length>0) {
			this.setState({isLoading});
		}
		return this.state.isLoading;
	}

	onLogin(user, isNewUser){
		this.setState({user});
		viewNavigator.push({
			screen: 'wizard',
			stages: [require('./app/images/post-intro.png'), require('./app/images/location-intro.png'), require('./app/images/profile-intro.png'), require('./app/images/alpha-intro.png')],
			style: {
				backgroundColor: 'white',
				buttonColor: '#E91E63'
			},
			showTitle: true,
			nextScreen: 'feed',
			reset: true
		})
		var expiryDate = new Date();
		expiryDate.setMonth(expiryDate.getMonth()+1)
		user.tokenExpiry = expiryDate.toISOString();

		AsyncStorage.setItem('@User', JSON.stringify(user));

		user.tracker = tracker;
		this.getLocation.call(this);
		this.getPoints.call(this);
		BackgroundJob.schedule();
		tracker.trackEvent('app', 'login', {label: isNewUser ? 'true' : 'false'});
	}

	async componentWillMount(){
		NetInfo.addEventListener('change', this.handleNetworkState);

		NetInfo.isConnected.fetch().then(isOnline =>{
			this.setState({isOnline});
		});

		var user = JSON.parse(await AsyncStorage.getItem('@User'));
		this.setState({user});

		if(!initialRouteStack){
			if(user){
				user.tracker = tracker;
				if((new Date(user.tokenExpiry).getTime() - new Date().getTime()) < 259200000){
					try {
						user = await this.refreshToken(user);
						if(user.invalidated){
							ToastAndroid.show('This user account has been disabled', ToastAndroid.LONG);
							this.setState({initialRouteStack:[{screen: 'login'}]});
							return;
						}
						tracker.trackEvent('app', 'refreshToken');
					} catch (error){
						ToastAndroid.show('An error occurred while getting user token. Make sure you are online and restart the app.', ToastAndroid.LONG);
						user.tracker.trackException(`RT-${JSON.stringify(error)}`, false);
						this.setState({isOnline: false});
					}
				}
				
				this.setState({initialRouteStack:[{screen: 'feed'}], showProfile: true});
				this.getLocation.call(this);
				this.getPoints.call(this);
			} else {
				this.setState({initialRouteStack:[{
					screen: 'wizard',
					stages: [require('./app/images/intro.png')],
					style: {
						backgroundColor: '#E91E63',
						buttonColor: '#C2185B'
					},
					showTitle: false,
					nextScreen: 'login'
				}]});
			}
			tracker.trackEvent('app', 'open', {label: 'drawer'});
		} else {
			this.setState({initialRouteStack});
		}
	}

	async componentWillUnmount(){
		NetInfo.removeEventListener('change', this.handleNetworkState);
	}

	getLocation(){
		this.state.user.location = null;
		this.setState({triedLocation: false});

		LocationServicesDialogBox.checkLocationServicesIsEnabled({
		  message: "<h3>Location off</h3> Around needs your location to continue. Would you like to turn on Location?",
		  ok: "YES",
		  cancel: "NO"
		}).then(success => {
		  navigator.geolocation.getCurrentPosition(position => {
			var user = this.state.user;
			user.location = {
				lat: position.coords.latitude,
				lon: position.coords.longitude
			}
			this.setState({user, triedLocation: true, isLoading: false});
		  }, error => {
			this.setState({triedLocation: true, isLoading: false});
		  }, {
			enableHighAccuracy: false,
			timeout: 20000
		  })
		}).catch(error => {
		  this.setState({triedLocation: true, isLoading: false});
		})
	}

	getPoints(){
	  if(this.state.isOnline){
		Functions.timeout(fetch(`${Config.SERVER}/api/users/getPoints?token=${this.state.user.token}`).then(response => response.json()).then(response => {
		  var user = this.state.user;
		  user.points = user.points + user.newPoints;
		  user.newPoints = response.data.Points - user.points;
		  user.level = Functions.calculateLevel(response.data.Points);
		  this.setState({user});
		  AsyncStorage.mergeItem('@User', JSON.stringify({points: user.points, newPoints: user.newPoints, level: user.level}));
	  })).catch(error => {
		  this.state.user.tracker.trackException(`LP-${JSON.stringify(error)}`, false);
	  })
	  }
	}

	configureScene(route){
		if(route.screen == 'profile'){
			return Navigator.SceneConfigs.VerticalUpSwipeJump;
		} else {
			return Navigator.SceneConfigs.PushFromRight;
		}
	}

	showProfile(){
		if(this.currentScreen != 'profile'){
			this.setLoading(false);
			viewNavigator.push({
				screen: 'profile',
				profileName: this.state.user.username
			})
		}
	}

	trackScreen(route){
		this.currentScreen = route.screen;
		if(route.screen == 'showImage' || route.screen == 'wizard' || route.screen == 'login' || route.screen == "register"){
			this.setState({showProfile: false});
		} else {
			this.setState({showProfile: true});
		}
		tracker.trackScreenView(route.screen);
	}

	resetScreen(route){
		if(route.reset){
			delete route['reset']
			viewNavigator.immediatelyResetRouteStack([route])
		}
	}

	refreshToken(user){
		return Functions.timeout(fetch(Config.SERVER + '/api/users/refreshToken', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				token: user.token
			})
		})).then(response => response.json()).then(response => {
			if(response.error){
				user.invalidated = true;
			} else {
				user.token = response.Token
			}

			var expiryDate = new Date();
			expiryDate.setMonth(expiryDate.getMonth()+1)
			user.tokenExpiry = expiryDate.toISOString();

			AsyncStorage.setItem('@User', JSON.stringify(user));
			return user;
		})
	}
}

AppRegistry.registerComponent('Round', () => Round);
