'use strict';

var mod_assert = require('assert-plus');
var mod_util = require('util');

var lib_draw = require('../draw');

function
ContentBox(options)
{
	mod_assert.optionalObject(options, 'options');
	mod_assert.optionalObject(options.format, 'options.format');
	mod_assert.optionalString(options.content, 'options.content');

	var self = this;

	if (!options) {
		options = {};
	}

	lib_draw.Region.call(self, {
		width: options.width,
		height: options.height
	});

	self.on('resize', function () {
		self._redo();
	});

	self.cb_content = options.content || '';
	self.cb_format = options.format || {};

	self._redo();
}
mod_util.inherits(ContentBox, lib_draw.Region);

ContentBox.prototype._redo = function
_redo()
{
	var lines = this.cb_content.split(/\n/g);

	this.clear();

	for (var i = 0; i < lines.length; ++i) {
		this.str(0, i, lines[i], this.cb_format);
	}
};

ContentBox.prototype.set_content = function
_set_content(content)
{
	mod_assert.string(content, 'content');
	this.cb_content = content;
	this._redo();
};

ContentBox.prototype.set_format = function
_set_format(format)
{
	mod_assert.object(format, 'format');
	this.cb_format = format;
	this._redo();
};

module.exports = {
	ContentBox: ContentBox
};
