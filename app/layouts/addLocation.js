import React, { Component } from 'react';
import {View, Text, Image, ListView, ToastAndroid, ToolbarAndroid, ActivityIndicator, TextInput, TouchableNativeFeedback, Alert} from 'react-native';
import Config from '../components/config.js';
import Functions from '../components/functions.js';

export default class AddLocation extends Component {
	constructor(props){
		super(props);
		this.dataSource = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
		this.state = {
			resultSource: null,
			isLoading: false,
			hasSearched: false,
		}
		this.search = {
			timer: null,
			searchResults: []
		}
	}

	render() {
		return (
			<View style={{flex: 1,  backgroundColor: 'white'}}>
				<ToolbarAndroid style={{height: 50, backgroundColor: '#E91E63'}} title="Add Location" titleColor="white" navIcon={{uri: 'ic_arrow_back_white_24dp'}} onIconClicked={()=>{this.props.navigator.pop()}}/>
				<View style={{flex: 1, padding: 10, justifyContent: 'space-between'}}>
					<View style={{flex: 1}}>
						<Text>Add new location from Google Maps</Text>
						<TextInput style={{marginLeft: -4}} underlineColorAndroid={'#E91E63'} selectionColor={'#F8BBD0'} placeholder="Search for a location" onChangeText={keyword => this.searchChange.call(this, keyword)}/>
						<Text style={{fontSize: 10}}>Note: You can only add locations around your current location (1.3KM). Roads and city areas (e.g. Colombo) cannot be added. Due to an issue with Google maps, some results may not be in English but will be added to Around in English.</Text>
						<Image style={{height: 20, width: 150}} source={require('../images/powered_by_google_icon.png')} resizeMode='contain'/>

						{!this.state.isLoading && this.search.searchResults.length==0 && this.state.hasSearched &&
							<View style={{justifyContent: 'center', alignItems: 'center'}}>
								<Text>No locations found</Text>
							</View>
						}

						{this.state.isLoading &&
							<View style={{justifyContent: 'center'}}>
								<ActivityIndicator styleAttr="Small" color="#F48FB1"/>
							</View>
						}

						{!this.state.isLoading && this.search.searchResults.length>0 &&
							<View style={{flex: 1, marginTop: 10}}>
								<Text>Select a location to add</Text>
								<ListView dataSource={this.state.resultSource} renderRow={this.renderLocation.bind(this)} />
							</View>
						}
					</View>
				</View>
			</View>
		)
	}

	renderLocation(location) {
		return (
			<TouchableNativeFeedback onPress={()=>{this.selectLocation.call(this, location)}}>
				<View style={{backgroundColor: '#F5F5F5', padding: 10, elevation: 1, margin: 2}}>
					<Text style={{flex: 1, fontWeight: 'bold', color:'#E91E63'}}>{location.Name}</Text>
					<Text style={{fontSize: 10}}>{location.Address}</Text>
					<Text style={{fontSize: 10}}>{location.Type}</Text>
				</View>
			</TouchableNativeFeedback>
		)
	}

	selectLocation(location) {
		Alert.alert('Add Location', `Do you want to add "${location.Name}" to Around?`, [
			{text: 'Yes', onPress: () => {this.addLocation.call(this, location)}},
			{text: 'No'}
		])
	}

	searchChange(keyword){
		clearTimeout(this.search.timer);
		if(keyword.length>0){
			this.search.timer = setTimeout(this.searchMaps.bind(this, keyword), Config.SEARCH_START_TIMEOUT);
		}
	}

	async searchMaps(keyword){
		this.setState({
			isLoading: true,
			hasSearched: true
		})
		var response = await Functions.timeout(fetch(`${Config.SERVER}/api/locations/searchMaps?token=${this.props.user.token}&keyword=${keyword}&lat=${this.props.user.location.lat}&lon=${this.props.user.location.lon}`).then(response => response.json()))
		.catch(error => {
			ToastAndroid.show('Couldn\'t contact server. Please clear and try again', ToastAndroid.LONG);
			this.setState({
				isLoading: false
			})
			this.props.user.tracker.trackException(`SM-${JSON.stringify(error)}`, false);
		});

		this.search.searchResults = response.data;
		this.setState({
			resultSource: this.dataSource.cloneWithRows(response.data),
			isLoading: false
		})
		this.props.user.tracker.trackEvent('app', 'addSearch', {label: keyword, value: response.data.length});
	}	

	addLocation(location){
		Functions.timeout(fetch(Config.SERVER + '/api/locations/addLocation', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				token: this.props.user.token,
				placeID: location.PlaceID
			})
		})).then(response => response.json()).then((response) => {
			var newLocation = {
				RowKey: location.PlaceID,
				Name: response.data.Name,
				Address:response.data.Address
			}

			this.props.addLocation(newLocation)
			this.props.navigator.replace({
				screen: 'showLocation',
				location: newLocation,
				addPost: this.props.addPost,
				onLocation: true
			})
			ToastAndroid.show('Location added successfully', ToastAndroid.LONG);
			this.props.user.tracker.trackEvent(location.PlaceID, 'addLocation');
		}).catch(error => {
			ToastAndroid.show('Couldn\'t contact server. Please try again', ToastAndroid.LONG);
			this.props.user.tracker.trackException(`AL-${JSON.stringify(error)}`, false);
		})
	}
}