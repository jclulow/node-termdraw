'use strict';

var mod_assert = require('assert-plus');
var mod_util = require('util');

var lib_draw = require('../draw');
var lib_boxdraw = require('../boxdraw');


function
Box(options)
{
	var self = this;

	if (!options) {
		options = {};
	}

	lib_draw.Region.call(self, {
		width: 1,
		height: 1
	});

	self.box_title = options.title;

	self.on('resize', function () {
		self._redo();
	});
	self._redo();
}
mod_util.inherits(Box, lib_draw.Region);

Box.prototype.set_title = function
set_title(title)
{
	var self = this;

	self.box_title = title;
	self._redo();
};

Box.prototype._redo = function
_redo()
{
	var self = this;

	self.clear();

	var fmt = {
		inverse: false
	};
	var box = lib_boxdraw.BOX_DRAW_NORMAL;

	self.chr(0, 0, box.topleft, fmt);
	self.chr(self.width() - 1, 0, box.topright, fmt);
	self.chr(0, self.height() - 1, box.bottomleft, fmt);
	self.chr(self.width() - 1, self.height() - 1, box.bottomright, fmt);

	for (var x = 1; x < self.width() - 1; x++) {
		self.chr(x, 0, box.horiz, fmt);
		self.chr(x, self.height() - 1, box.horiz, fmt);
	}
	for (var y = 1; y < self.height() - 1; y++) {
		self.chr(0, y, box.verti, fmt);
		self.chr(self.width() - 1, y, box.verti, fmt);
	}

	self.str(2, 0, ' ' + self.box_title + ' ', fmt);

	mod_assert.ok(self.r_children.length < 2, 'self.r_children.length < 2');
	if (self.r_children.length === 1) {
		self.r_children[0].rc_width = self.width() - 2;
		self.r_children[0].rc_height = self.height() - 2;
		self.r_children[0].rc_region.resize(self.r_children[0].rc_width,
		    self.r_children[0].rc_height);
	}
};

module.exports = {
	Box: Box
};
