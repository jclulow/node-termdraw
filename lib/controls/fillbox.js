'use strict';

var mod_assert = require('assert-plus');
var mod_util = require('util');

var lib_draw = require('../draw');


function
fill(r, ch, format)
{
	for (var x = 0; x < r.width(); x++) {
		for (var y = 0; y < r.height(); y++) {
			r.chr(x, y, ch, format);
		}
	}
}

function
FillBox(ch)
{
	var self = this;

	lib_draw.Region.call(self, {
		width: 1,
		height: 1
	});

	mod_assert.string(ch, 'ch');
	mod_assert.strictEqual(ch.length, 1, 'ch.length');
	self.fb_char = ch;

	self._redo();
	self.on('resize', function () {
		self._redo();
	});
}
mod_util.inherits(FillBox, lib_draw.Region);

FillBox.prototype._redo = function
_redo()
{
	var self = this;

	self.clear();
	fill(self, self.fb_char, { inverse: true });
	self.str(3, 0, ' size: ' + self.width() + ' x ' + self.height() + ' ');
};

module.exports = {
	FillBox: FillBox
};
