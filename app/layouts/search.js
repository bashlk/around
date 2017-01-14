import React, { Component } from 'react';
import {View, Text, Image, ListView, ToastAndroid, ToolbarAndroid, ActivityIndicator, TextInput, TouchableNativeFeedback, Alert, Dimensions} from 'react-native';
import Config from '../components/config.js';
import Functions from '../components/functions.js';

export default class Search extends Component {
	constructor(props){
		super(props);
		this.dataSource = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
		this.state = {
			resultSource: this.dataSource.cloneWithRows([]),
			hasSearched: false
		}
		this.search = {
			timer: null,
			previousResults: []
		}
	}

	render() {
		return (
			<View style={{flex: 1,  backgroundColor: 'white'}}>
				<View style={{height: 50, backgroundColor: '#E91E63', padding: 10, flexDirection: 'row'}}>
					<TouchableNativeFeedback onPress={()=>{this.props.navigator.pop()}} background={TouchableNativeFeedback.Ripple('#F8BBD0')}>
						<View>
							<Image style={{width: 30, height: 32}} source={require('../images/back_icon.png')} />
						</View>
					</TouchableNativeFeedback>
					<TextInput style={{flex:1, backgroundColor: 'white', padding: 2, borderRadius: 2, marginLeft: 10}} placeholder='Search for a location' underlineColorAndroid='transparent' autoCorrect={false} onChangeText={keyword => this.searchChange.call(this, keyword)}/>
				</View>

				<View style={{paddingHorizontal: 10}}>
					{!this.props.isLoading() && this.search.previousResults.length==0 && this.state.hasSearched &&
						<View style={{justifyContent: 'center', alignItems: 'center', marginTop: 10}}>
							<Text>No locations found</Text>
						</View>
					}

					<ListView style={{marginTop: 10}} dataSource={this.state.resultSource} renderRow={this.renderLocation.bind(this)} renderFooter={this.renderFooter.bind(this)}/>
				</View>
			</View>
		)
	}

	renderLocation(location) {
		return (
			<TouchableNativeFeedback onPress={this.showLocation.bind(this, location)} background={TouchableNativeFeedback.Ripple('#F8BBD0')}>
				<View style={{backgroundColor: '#F5F5F5', padding: 10, elevation: 1, marginBottom: 5}}>
					<Text style={{flex: 1, fontWeight: 'bold', color:'#E91E63'}}>{location.Name}</Text>
					<Text style={{fontSize: 10}}>{location.Address}</Text>
				</View>
			</TouchableNativeFeedback>
		)
	}

	renderFooter(){
		return (
			<TouchableNativeFeedback onPress={this.addLocation.bind(this)} background={TouchableNativeFeedback.Ripple('#F8BBD0')}>
				<View style={{flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', elevation: 1, padding: 8}}>
					<Image style={{width: 30, height: 30, tintColor: '#E91E63'}} source={require('../images/add_icon.png')} />
					<Text style={{fontSize: 16, marginLeft: 5, color: '#E91E63', fontWeight: 'bold'}}>Add new location</Text>
				</View>
			</TouchableNativeFeedback>
		)
	}

	searchChange(keyword){
		clearTimeout(this.search.timer);

		if(keyword.length>0){
			this.setState({
				hasSearched: true
			})
			this.props.isLoading(true);
			keyword = keyword.toLowerCase().replace(/ /g,'');
			if(this.search.previousKeyword){
				var regex = new RegExp(`^${this.search.previousKeyword}.*`)
				if(regex.test(keyword)){
					var currentResults = [];
					regex = new RegExp(`^${keyword}.*`);

					this.search.previousResults.forEach(result=>{
						if(regex.test(result.RowKey)){
							currentResults.push(result)
						}
					})
					this.setState({
						searchResults: this.dataSource.cloneWithRows(currentResults),
					});
					this.props.isLoading(false);
					return;
				} 
			}
			this.search.timer = setTimeout(this.searchDB.bind(this, keyword), 1000);
		} else {
			this.props.isLoading(false);
		}
	}

	async searchDB(keyword){
		try {
			var results = await Functions.timeout(fetch(`${Config.SERVER}/api/locations/search?token=${this.props.user.token}&keyword=${keyword}`).then(response => response.json()));
			this.search.previousKeyword = keyword;
			this.search.previousResults = results.data;
			this.setState({
				resultSource: this.dataSource.cloneWithRows(results.data),
			});
			this.props.isLoading(false);
		} catch(error){
			ToastAndroid.show('Couldn\'t contact server', ToastAndroid.LONG);
			this.props.isLoading(false);
		}
	}

	addLocation(){
		this.props.isLoading(false);
		this.props.navigator.push({
			screen: 'addLocation'
		})
	}

	showLocation(location){
		this.props.isLoading(false);
		this.props.navigator.push({
			screen: 'showLocation',
			location: location
		})
	}
}