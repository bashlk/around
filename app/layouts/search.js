import React, { Component } from 'react';
import {View, Text, Image, ListView, ToastAndroid, ToolbarAndroid, ActivityIndicator, TextInput, TouchableNativeFeedback, Alert, Dimensions} from 'react-native';
import Config from '../components/config.js';
import Functions from '../components/functions.js';

export default class Search extends Component {
	constructor(props){
		super(props);
		this.dataSource = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
		this.state = {
			resultSource: null,
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

				<View style={{paddingHorizontal: 5}}>
					{!this.props.isLoading() && this.search.previousResults.length==0 && this.state.hasSearched &&
						<Text style={{textAlign: 'center', marginTop: 5}}>No locations found</Text>
					}

					{!this.props.isLoading() && !this.state.hasSearched &&
					<Text style={{marginTop: 5}}>Trending locations</Text>
					}

					{this.state.resultSource &&
					<ListView dataSource={this.state.resultSource} renderRow={this.renderLocation.bind(this)} />
					}
				</View>
			</View>
		)
	}

	renderLocation(location) {
		return (
			<TouchableNativeFeedback onPress={this.showLocation.bind(this, location)} background={TouchableNativeFeedback.Ripple('#F8BBD0')}>
				<View style={{flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F5F5F5', marginTop: 6, padding: 10, elevation: 1}}>
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
			</TouchableNativeFeedback>
		)
	}

	async componentDidMount() {
		this.props.isLoading(true);
		var locations = await Functions.timeout(fetch(`${Config.SERVER}/api/locations/getHypeLocations?token=${this.props.user.token}`)).then(response => response.json());
		this.props.isLoading(false);
		if(!this.state.hasSearched){
			this.setState({
				resultSource: this.dataSource.cloneWithRows(locations.data)
			})
		}
	}

	searchChange(keyword){
		clearTimeout(this.search.timer);

		if(keyword.length>0){
			this.setState({
				hasSearched: true,
				resultSource: null
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

	showLocation(location){
		this.props.isLoading(false);
		this.props.navigator.push({
			screen: 'showLocation',
			location: location,
			onLocation: false
		})
	}
}