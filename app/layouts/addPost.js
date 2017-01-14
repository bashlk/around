import React, { Component } from 'react';
import { View, Text, TextInput, Picker, TouchableNativeFeedback, ToastAndroid, Alert, Image, ToolbarAndroid} from 'react-native';
import ImagePicker from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import CacheEngine from '../components/cacheEngine.js';

export default class AddPost extends Component {
	constructor(props){
		super(props);
		this.state = {
			selectedLocation: props.locations[0],
			message: '',
			attachment: null
		}
	}

	render() {
		return(
			<View style={{flex: 1, backgroundColor: 'white'}}>
				<ToolbarAndroid style={{height: 50, backgroundColor: '#E91E63'}} title="New message" titleColor="white" navIcon={require('../images/back_icon.png')} onIconClicked={()=>{this.props.navigator.pop()}}/>

				<View style={{padding: 20}}>
					<Text>Posting to</Text>
					<Picker mode={'dropdown'} style={{marginLeft: -5}} selectedValue={this.state.selectedLocation} onValueChange={(selectedLocation) => {this.setState({selectedLocation})}}>
						{
							this.props.locations.map((location)=>{
								return <Picker.Item label={location.Name} key={location.PlaceID} value={location}/>
							})
						}
					</Picker>
					<Text>Message</Text>
					<TextInput style={{textAlignVertical: 'top'}} multiline={true} numberOfLines={6} underlineColorAndroid={'#E91E63'} selectionColor={'#F8BBD0'} onChangeText={(message) => this.setState({message})} autoFocus={true}/>
					
					<View style={{flexDirection: 'row', marginBottom: 5}}>
						{!this.state.attachment &&
							<TouchableNativeFeedback onPress={this.addAttachment.bind(this)} background={TouchableNativeFeedback.Ripple('#C2185B', true)}>
							<View style={{height: 30, width: 30, borderRadius: 50}}>
								<Image style={{width: 30, height: 30, tintColor: '#707070'}} source={require('../images/add_photo_icon.png')} />
							</View>
						</TouchableNativeFeedback>
						}
						

						{this.state.attachment &&
							<Image style={{width: 50, height: 50}} source={{uri: this.state.attachment}}/>
						}
					</View>
					
					<TouchableNativeFeedback onPress={this.addPost.bind(this)} background={TouchableNativeFeedback.Ripple('#C2185B')}>
						<View style={{height: 40, backgroundColor: '#E91E63', justifyContent: 'center', elevation: 2, borderRadius: 2}}>
							<Text style={{color: 'white', textAlign: 'center', fontSize: 15}}>Post message</Text>
						</View>
					</TouchableNativeFeedback>
				</View>
			</View>
		)
	}

	addPost(){
		if(this.state.message.length > 0){
			CacheEngine.addPost(this.state.message, this.state.selectedLocation, this.state.attachment).then((post)=>{
				ToastAndroid.show('Message posted successfully', ToastAndroid.SHORT);
				this.props.addPost(post);
			}).catch(error => {
				ToastAndroid.show('An error occured while posting your message');
			})

			this.props.navigator.pop();
		}else{
			Alert.alert('Error', 'Please enter a message first');
		}
	}

	addAttachment(){
	ImagePicker.launchImageLibrary({}, (response)  => {
		if(response.didCancel){
			return;
		}
		if(response.error){
			ToastAndroid.show('An error occurred while selecting photo');
			return;
		}

		ImageResizer.createResizedImage(response.uri, 1000, 500, 'JPEG', 80).then((attachment)=>{
			this.setState({attachment})
		});
	});
	}
}