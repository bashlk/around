import Config from '../components/config.js';

var levelMap = [0, 10, 20, 40, 60, 100, 150, 200, 250, 300, 400];

function getLevel(points){
	for(var index = 0; index < 8; index++){
		if(points < levelMap[index]){
			var level = {
				level: index,
				progress: (points/levelMap[index])
			}
			return level;
		}
	}
}

export default class Functions{
	static timeout(promise) {
		return new Promise(function(resolve, reject) {
			setTimeout(function() {
				reject(new Error("timeout"));
			}, Config.SERVER_TIMEOUT)
			promise.then(resolve, reject);
		})
	}

	static timeDifference(date){
		date = new Date(date);
		var delta = Math.round((+new Date - date)/1000);

		switch(true){
			case(delta<=120):
				return 'Just now';
			case(delta<3600):
				return Math.floor(delta/60) + ' minutes ago';
			case(delta<7200):
				return '1 hour ago';
			case(delta<86400):
				return Math.floor(delta/3600) + ' hours ago';
			case(delta<172800):
				return 'Yesterday';
			case(delta<604800):
				return Math.floor(delta/86400) + ' days ago';
			default:
				var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
				return `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
		}
	}

	static calculateLevel(points){
		return getLevel(points);
	}

	static getLevelDetails(points){
		var level = getLevel(points);
		level.floor = levelMap[level.level-1];
		level.ceiling = levelMap[level.level];
		return level;
	}
}