'use strict';

var mod_assert = require('assert-plus');
var mod_util = require('util');

var lib_draw = require('../draw');


function
FillBox(options)
{
	var self = this;

	mod_assert.optionalObject(options, 'options');
	if (!options) {
		options = { };
	}

	mod_assert.optionalObject(options.format, 'options.format');
	mod_assert.optionalString(options.character, 'options.character');
	if (typeof (options.character) !== 'string') {
		options.character = ' ';
	}
	mod_assert.strictEqual(options.character.length, 1,
	    'options.character.length');

	lib_draw.Region.call(self, {
		width: options.width,
		height: options.height
	});

	self.on('resize', function () {
		self._redo();
	});

	self.fb_char = options.character;
	self.fb_fmt = options.format || {};

	self._redo();
}
mod_util.inherits(FillBox, lib_draw.Region);

FillBox.prototype._redo = function
_redo()
{
	var w = this.width();
	var h = this.height();

	this.clear();

	for (var x = 0; x < w; x++) {
		for (var y = 0; y < h; y++) {
			this.chr(x, y, this.fb_char, this.fb_fmt);
		}
	}
};

FillBox.prototype.set_character = function
_set_character(character)
{
	mod_assert.string(character, 'character');
	mod_assert.strictEqual(character.length, 1, 'character.length');

	this.fb_char = character;
	this._redo();
};

FillBox.prototype.set_format = function
_set_format(format)
{
	mod_assert.object(format, 'format');

	this.fb_fmt = format;
	this._redo();
};

module.exports = {
	FillBox: FillBox
};
