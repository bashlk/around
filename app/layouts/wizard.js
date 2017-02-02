import React, { Component } from 'react';
import { View, Text, TouchableNativeFeedback, Image, Dimensions, Button, ToolbarAndroid } from 'react-native';

export default class Wizard extends Component {
	constructor(props){
		super(props);

		this.state = {
			current: 0
		}
	}

	render() {
		return(
			<View style={{flex: 1, backgroundColor: this.props.style.backgroundColor}}>
				{this.props.showTitle &&
				<ToolbarAndroid style={{height: 50, backgroundColor: '#E91E63'}} titleColor="white" title='Getting started' />
				}
				<View style={{flex: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20}}>
					<Image style={{width: Dimensions.get('window').width - 5}} source={this.props.stages[this.state.current]} resizeMode='contain'/>
				</View>
				
				<View style={{flex: 1, paddingHorizontal: 20}}>
					{this.state.current >= this.props.stages.length - 1 &&
						<Button onPress={this.finish.bind(this)} title="Let's start!" color={this.props.style.buttonColor}/>
					}

					{this.state.current < this.props.stages.length -1 &&
					<View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
						<TouchableNativeFeedback onPress={this.finish.bind(this)}>
							<View style={{height: 30, width: 60, alignItems: 'center', justifyContent: 'center'}}>
								<Text style={{fontWeight: 'bold'}}>SKIP</Text>
							</View>
						</TouchableNativeFeedback>

						<TouchableNativeFeedback onPress={this.next.bind(this)}>
							<View style={{height: 30, width: 60, alignItems: 'center', justifyContent: 'center'}}>
								<Text style={{fontWeight: 'bold', color: '#E91E63'}}>NEXT</Text>
							</View>
						</TouchableNativeFeedback>
					</View>
					}
				</View>
			</View>
		)
	}

	finish(){
		this.props.navigator.push({
			screen: this.props.nextScreen,
			reset: true
		})
	}

	next(){
		this.setState({
			current: this.state.current + 1
		})
	}
}