import React, { Component } from 'react';
import { View, TouchableNativeFeedback, Image } from 'react-native';
import PhotoView from 'react-native-photo-view';

export default class ShowImage extends Component {
	render() {
		return(
			<View style={{flex: 1, backgroundColor: 'black'}}>
				<View style={{position: 'absolute', top: 10, left: 10, height: 50, zIndex: 2}}>
					<TouchableNativeFeedback onPress={()=>{this.props.navigator.pop()}}>
						<View style={{width: 30, height: 30}}>
							<Image style={{width: 30, height: 30}} source={require('../images/back_icon.png')} />
						</View>
					</TouchableNativeFeedback>
				</View>

				<PhotoView
				  source={{uri: `https://aroundapp.blob.core.windows.net/posts/${this.props.rowKey}`}}
				  minimumZoomScale={1}
				  maximumZoomScale={3}
				  androidScaleType="fitCenter"
				  style={{flex: 1}} />
			</View>
		)
	}
}