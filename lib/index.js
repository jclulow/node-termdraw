'use strict';

module.exports = {
	Draw: require('./draw').Draw,
	Region: require('./region').Region,
	controls: {
		Box: require('./controls/box').Box,
		ContentBox: require('./controls/content').ContentBox,
		FillBox: require('./controls/fillbox').FillBox,
		Layout: require('./controls/layout').Layout,
		LogBox: require('./controls/logbox').LogBox
	}
};
