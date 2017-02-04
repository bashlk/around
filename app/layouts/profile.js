import React, { Component } from 'react';
import {View, Text, Image, ListView, AsyncStorage, TouchableNativeFeedback, ToastAndroid} from 'react-native';
import ProgressBar from 'react-native-progress/Bar'

import Config from '../components/config.js';
import Functions from '../components/functions.js';

export default class Profile extends Component {
	constructor(props) {
		super(props);
		this.state = {
			profile: null
		}
	}

	render() {
		return (
			<View style={{flex: 1, backgroundColor: '#E91E63'}}>
				<View style={{height: 50, padding: 10, flexDirection: 'row', alignSelf: 'flex-start'}}>
					<TouchableNativeFeedback onPress={()=>{this.props.navigator.pop()}}>
						<View>
							<Image style={{width: 25, height: 25}} source={{uri: 'ic_arrow_back_white_24dp'}} />
						</View>
					</TouchableNativeFeedback>
				</View>

				<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
					<Text style={{fontSize: 28, color: 'white'}}>{this.props.profileName}</Text>
					{this.state.profile &&
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Text style={{fontSize: 14, color: 'white'}}>Level <Text style={{fontWeight: 'bold'}}>{this.state.level.level}</Text> </Text>

						<View style={{marginTop: 20}}>
							<ProgressBar progress={this.state.level.progress} width={300} height={15} borderRadius={0} color='white' borderColor='#E91E63' unfilledColor='#AD1457'/>
							<View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
								<Text style={{color: 'white'}}>{this.state.level.floor}</Text>
								<Text style={{color: 'white'}}>{this.state.level.ceiling}</Text>
							</View>
						</View>

						<View>
							<Text style={{color: 'white'}}><Text style={{fontWeight: 'bold', fontSize: 16}}>{this.state.profile.Points}</Text> Points</Text>
							<Text style={{color: 'white'}}><Text style={{fontWeight: 'bold'}}>5</Text> Bonus points</Text>
							<Text style={{color: 'white'}}><Text style={{fontWeight: 'bold'}}>{this.state.profile.BoostCount}</Text> Message upvotes</Text>
							<Text style={{color: 'white'}}><Text style={{fontWeight: 'bold'}}>{this.state.profile.LocationPostCount}</Text> Posts in created locations</Text>

							
							<Text style={{color: 'white', marginTop: 20}}><Text style={{fontWeight: 'bold'}}>{this.state.profile.PostCount}</Text> Messages posted</Text>
							<Text style={{color: 'white'}}><Text style={{fontWeight: 'bold'}}>{this.state.profile.LocationCount}</Text> Locations created</Text>
							<Text style={{color: 'white'}}><Text style={{fontWeight: 'bold'}}>{this.state.profile.ViewCount}</Text> Message views</Text>

							
						
							<Text style={{color: 'white', marginTop: 20}}>Rank <Text style={{fontWeight: 'bold', fontSize: 16}}>#{this.state.profile.Rank}</Text></Text>
							<Text style={{color: 'white'}}>Ahead of <Text style={{fontWeight: 'bold'}}>{this.state.profile.Ahead}</Text> other users</Text>
							<Text style={{color: 'white'}}>Points to next rank: <Text style={{fontWeight: 'bold'}}>{this.state.profile.NextRank}</Text></Text>
						</View>
					</View>
					}
				</View>
			</View>
		)
	}

	async componentDidMount(){
		var currentUser = this.props.user.username == this.props.profileName;

		if(currentUser && this.props.user.profile){
			this.props.user.profile.Points = this.props.user.points + this.props.user.newPoints;
			this.setState({
				profile: this.props.user.profile,
				level: Functions.getLevelDetails(this.props.user.profile.Points)
			})
		}

		if(this.props.isOnline){
			this.props.isLoading(true);
			Functions.timeout(fetch(`${Config.SERVER}/api/users/getProfile?token=${this.props.user.token}&username=${this.props.profileName}`).then(response => response.json()).then(response => {
				this.setState({
					profile: response.data,
					level: Functions.getLevelDetails(response.data.Points)
				})
				this.props.isLoading(false);

				if(currentUser){
					AsyncStorage.mergeItem('@User', JSON.stringify({profile: response.data}));
				}
			})).catch(error => {
				ToastAndroid.show('An error occurred while loading profile', ToastAndroid.LONG);
			})
		}
	}
}