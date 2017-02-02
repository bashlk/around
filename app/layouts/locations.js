import React, { Component } from 'react';
import {View, Text, ListView, ToolbarAndroid, TouchableNativeFeedback, Button, ToastAndroid } from 'react-native';

export default class Locations extends Component {
	constructor(props) {
		super(props);
		this.dataSource = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
		this.state = {
			locationSource: this.dataSource.cloneWithRows(this.props.locations)
		}
	}

	render() {
		return(
			<View style={{flex: 1, backgroundColor: 'white', paddingBottom: 10}}>
				<ToolbarAndroid style={{height: 50, backgroundColor: '#E91E63'}} titleColor="white" title='Locations Around' navIcon={require('../images/back_icon.png')} onIconClicked={()=>{this.props.navigator.pop()}}/>
				<ListView
					dataSource={this.state.locationSource}
					renderRow={this.renderLocation.bind(this)}
				/>

				<View style={{paddingHorizontal: 5}}>
					<Button onPress={this.addLocation.bind(this)} title="Add new location" color="#E91E63"/>
				</View>
			</View>
		)
	}

	renderLocation(location) {
		return (
			<TouchableNativeFeedback onPress={this.showLocation.bind(this, location)}>
				<View style={{flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F5F5F5', marginHorizontal: 5, marginTop: 6, padding: 10, elevation: 1}}>
					<View>
						<Text style={{flex: 1, fontWeight: 'bold', color: '#E91E63'}}>{location.Name}</Text>
						<Text style={{fontSize: 10}}>{location.Address}</Text>
					</View>

					{location.Activity > 0 &&
					<View style={{justifyContent: 'center', marginRight: 10}}>
						<View style={{width: 30, height: 20, borderRadius: 5, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center'}}>
							<Text style={{color: 'white', fontWeight: 'bold'}}>{location.Activity}</Text>
						</View>
					</View>
					}
				</View>
			</TouchableNativeFeedback>		)
	}

	showLocation(location){
		this.props.navigator.push({
			screen: 'showLocation',
			location: location,
			addPost: this.props.addPost,
			onLocation: true
		})
	}

	addLocation(){
		if(!this.props.isOnline){
			ToastAndroid.show('You are offline. Please check your internet connection and try again', ToastAndroid.LONG);
			return;
		}

		if(!this.props.user.location){
			ToastAndroid.show('Error: Location unavailable', ToastAndroid.LONG);
			return;
		}
		
		this.props.navigator.push({
			screen: 'addLocation', 
			addLocation: this.addNewLocation.bind(this), 
			addPost: this.props.addPost
		})
	}

	addNewLocation(location){
		this.props.addLocation(location)
		this.setState({
			locationSource: this.dataSource.cloneWithRows(this.props.locations)
		})
	}
}