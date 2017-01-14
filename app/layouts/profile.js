import React, { Component } from 'react';
import {View, Text, Image, ListView, AsyncStorage, TouchableNativeFeedback} from 'react-native';
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
					<TouchableNativeFeedback onPress={()=>{this.props.navigator.pop()}} background={TouchableNativeFeedback.Ripple('#F8BBD0')}>
						<View>
							<Image style={{width: 30, height: 32}} source={require('../images/back_icon.png')} />
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
							<Text style={{color: 'white'}}><Text style={{fontWeight: 'bold'}}>{this.state.profile.PostCount}</Text> Posts</Text>
							<Text style={{color: 'white'}}><Text style={{fontWeight: 'bold'}}>{this.state.profile.ViewCount}</Text> Post views</Text>
							<Text style={{color: 'white'}}><Text style={{fontWeight: 'bold'}}>{this.state.profile.BoostCount}</Text> Post boosts</Text>
						
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
		this.props.isLoading(true);
		var currentUser = this.props.user.username == this.props.profileName;

		if(currentUser && this.props.user.profile){
			this.props.user.profile.Points = this.props.user.points + this.props.user.newPoints;
			this.setState({
				profile: this.props.user.profile,
				level: Functions.getLevelDetails(this.props.user.profile.Points)
			})
		}

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
		 	this.props.isLoading(false);
		 })
	}
}