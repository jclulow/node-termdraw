'use strict';

module.exports = {
	Draw: require('./draw').Draw,
	Region: require('./region').Region,
	controls: {
		Box: require('./controls/box').Box,
		ContentBox: require('./controls/content').ContentBox,
		FillBox: require('./controls/fillbox').FillBox,
		VLayout: require('./controls/layout').VLayout,
		HLayout: require('./controls/layout').HLayout,
		LogBox: require('./controls/logbox').LogBox
	}
};
