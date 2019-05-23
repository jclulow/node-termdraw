'use strict';

var mod_assert = require('assert-plus');
var mod_util = require('util');

var lib_draw = require('../draw');
var lib_boxdraw = require('../boxdraw');

var format_label = lib_boxdraw.format_label;

function
Box(options)
{
	var self = this;

	if (!options) {
		options = {};
	}

	lib_draw.Region.call(self, {
		width: options.width,
		height: options.height
	});

	mod_assert.optionalString(options.title, 'options.title');
	self.box_title = options.title;

	mod_assert.optionalObject(options.child, 'options.child');
	self.box_child = options.child || null;

	self.on('resize', function () {
		self._redo();
	});
	self._redo();
}
mod_util.inherits(Box, lib_draw.Region);

Box.prototype.set_title = function
set_title(title)
{
	mod_assert.optionalString(title, 'title');
	var self = this;

	self.box_title = title;
	self._redo();
};

Box.prototype.set_child = function
set_child(child)
{
	mod_assert.optionalObject(child, 'child');
	var self = this;

	self.box_child = child || null;
	self._redo();
};

Box.prototype.pop_hint = function
pop_hint()
{
	var self = this;
	var chint;

	if (self.box_child !== null &&
	    (chint = self.box_child.pop_hint()) !== null) {
		chint.hint_y0 += 1;
		chint.hint_y1 += 1;
		chint.hint_width += 2;

		return (chint);
	}

	return (lib_draw.Region.prototype.pop_hint.call(this));
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
	var width = self.width();
	var height = self.height();

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

	if (self.box_title) {
		self.str(2, 0, format_label(self.box_title, width - 2), fmt);
	}

	if (self.box_child === null) {
		return;
	}

	if (width > 2 && height > 2) {
		self.box_child.resize(self.width() - 2, self.height() - 2);
	} else {
		self.box_child.resize(0, 0);
	}
};

Box.prototype.get_cell = function
get_cell(x, y)
{
	var self = this;

	if (x >= self.width() || y >= self.height()) {
		return (null);
	}

	if (self.box_child !== null) {
		var bcx = x - 1;
		var bcy = y - 1;
		if (bcx >= 0 && bcy >= 0 &&
		    bcx < self.box_child.width() &&
		    bcy < self.box_child.height()) {
			return (self.box_child.get_cell(bcx, bcy));
		}
	}

	return (lib_draw.Region.prototype.get_cell.call(this, x, y));
};

Box.prototype.get_cursor = function
getCursor()
{
	var self = this;

	if (self.box_child !== null) {
		var cursor = self.box_child.get_cursor();
		if (cursor !== null) {
			return ({
				x: cursor.x + 1,
				y: cursor.y + 1
			});
		}
	}

	return (null);
};

module.exports = {
	Box: Box
};
