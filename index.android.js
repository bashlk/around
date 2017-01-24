import React, { Component } from 'react';
import { AppRegistry, Navigator, View, StatusBar, BackAndroid, AsyncStorage, Text, ActivityIndicator, Dimensions, NetInfo, TouchableNativeFeedback} from 'react-native';
import ProgressBar from 'react-native-progress/Bar';
import LocationServicesDialogBox from "react-native-android-location-services-dialog-box";
import Functions from './app/components/functions.js';

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

var viewNavigator, currentScreen;
BackAndroid.addEventListener('hardwareBackPress', () => {
    if (viewNavigator.getCurrentRoutes().length === 1) {
     return false;
  	}
  	viewNavigator.pop();
  	return true;
 });

export default class Round extends Component {
  constructor(props){
    super(props);
    this.state = {
      initialRoute: false,
      isLoading: false,
      isOnline: true,
      user: false,
      triedLocation: false,
      currentScreen: null
    }
  }

  render() {
    return (
      <View style={{flex: 1}}>
      	<StatusBar backgroundColor="#880E4F" barStyle="light-content" />
        {this.state.initialRoute &&
      	<Navigator ref={(nav)=>{viewNavigator = nav;}} initialRoute={this.state.initialRoute} configureScene={this.configureScene} renderScene={(route, viewNavigator) => {
          currentScreen = route.screen;
          switch(route.screen){
      			case 'login':
      				return <Login navigator={viewNavigator} onLogin={this.onLogin.bind(this)} isOnline={this.state.isOnline}/>;
      	 			break;
      	 		case 'register':
      	 			return <Register navigator={viewNavigator} onLogin={this.onLogin.bind(this)} isOnline={this.state.isOnline}/>;
      	 			break;
            case 'feed':
              return <Feed navigator={viewNavigator} user={this.state.user} isLoading={this.setLoading.bind(this)} isOnline={this.state.isOnline}/>;
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
              return <AddLocation navigator={viewNavigator} user={this.state.user} />
              break;
            case 'profile':
              return <Profile navigator={viewNavigator} user={this.state.user} isLoading={this.setLoading.bind(this)} profileName={route.profileName}/>
              break;
            case 'search':
              return <Search navigator={viewNavigator} user={this.state.user} isLoading={this.setLoading.bind(this)} isOnline={this.state.isOnline}/>
              break;
            case 'locations':
              return <Locations navigator={viewNavigator} locations={route.locations} />
              break;
            case 'notifications':
              return <Notifications navigator={viewNavigator} user={this.state.user} />
              break;
            case 'showImage':
              return <ShowImage navigator={viewNavigator} rowKey={route.rowKey} />
              break;
      		}
      	}}
      	/>}

        {this.state.isOnline && this.state.triedLocation && !this.state.user.location &&
        <View style={{height: 20, backgroundColor: 'red', justifyContent: 'center'}}>
          <Text style={{color: 'white', textAlign:'center', fontSize: 11}}>Failed to get location. Tap here to retry</Text>
        </View>
        }

        {!this.state.isOnline && this.state.user &&
        <View style={{height: 20, backgroundColor: 'red', justifyContent: 'center'}}>
          <Text style={{color: 'white', textAlign:'center', fontSize: 11}}>You are offline. Showing previously retrieved content</Text>
        </View>
        }

        {this.state.user && 
        <TouchableNativeFeedback onPress={this.showProfile.bind(this)} background={TouchableNativeFeedback.Ripple('#F8BBD0')}>
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

  onLogin(user){
    this.setState({user});
    AsyncStorage.setItem('@User', JSON.stringify(user));
    this.getLocation.call(this);
    this.getPoints.call(this);
  }

  async componentWillMount(){
    NetInfo.addEventListener('change', ()=>{
      NetInfo.isConnected.fetch().then(isOnline =>{
        this.setState({isOnline});
      });
    });

    var user = JSON.parse(await AsyncStorage.getItem('@User'));
    if(user){
      this.setState({initialRoute:{screen: 'feed'}, user});
      this.getLocation.call(this);
      this.getPoints.call(this);
    } else {
      this.setState({initialRoute:{screen: 'login'}});
    }
  }

  getLocation(){
    this.setState({isLoading: true});
    var user = this.state.user;
    user.location = {
      lat: 6.866747,
      lon: 79.860955
    }
    this.setState({user, triedLocation: true});

    // LocationServicesDialogBox.checkLocationServicesIsEnabled({
    //   message: "<h3>Location off</h3> Around needs your location to continue. Would you like to turn on Location?",
    //   ok: "YES",
    //   cancel: "NO"
    // }).then(success => {
    //   navigator.geolocation.getCurrentPosition(position => {
    //     var user = this.state.user;
    //     user.location = {
    //         lat: position.coords.latitude,
    //         lon: position.coords.longitude
    //     }
    //     this.setState({user, triedLocation: true});
    //   }, error => {
    //     this.setState({triedLocation: true, isLoading: false});
    //   }, {
    //     enableHighAccuracy: true,
    //     timeout: 20000
    //   })
    // }).catch(error => {
    //   this.setState({triedLocation: true, isLoading: false});
    // })
  }

  getPoints(){
    Functions.timeout(fetch(`${Config.SERVER}/api/users/getPoints?token=${this.state.user.token}`).then(response => response.json()).then(response => {
      var user = this.state.user;
      //user.points = 0; user.newPoints = 0;
      user.points = user.points + user.newPoints;
      user.newPoints = response.data.Points - user.points;
      user.level = Functions.calculateLevel(response.data.Points);
      this.setState({user});
      AsyncStorage.mergeItem('@User', JSON.stringify({points: user.points, newPoints: user.newPoints, level: user.level}));
    })).catch(error => {
      console.log(error);
    })
  }

  configureScene(route){
    if(route.screen == 'profile'){
      return Navigator.SceneConfigs.VerticalUpSwipeJump;
    } else {
      return Navigator.SceneConfigs.PushFromRight;
    }
  }

  showProfile(){
    if(currentScreen != 'profile'){
      this.setLoading(false);
      viewNavigator.push({
        screen: 'profile',
        profileName: this.state.user.username
      })
    }
  }
}


AppRegistry.registerComponent('Round', () => Round);
