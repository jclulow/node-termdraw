'use strict';

var mod_assert = require('assert-plus');
var mod_util = require('util');

var lib_draw = require('../draw');


function
LogBox()
{
	var self = this;

	lib_draw.Region.call(self, {
		width: 1,
		height: 1
	});

	self.lb_lines = [];
	self.lb_roffset = null;
	self.lb_roffset_last = 0;

	self._redo();
	self.on('resize', function () {
		self._redo();
	});
}
mod_util.inherits(LogBox, lib_draw.Region);

LogBox.prototype._redo = function
_redo()
{
	var self = this;

	self.clear();


	/*
	 * Render all of the lines that we have.
	 */
	var rendered = [];
	var r = null;

	function commit() {
		if (r !== null) {
			rendered.push(r);
		}
		r = null;
	}

	function addc(c) {
		if (r === null) {
			r = '';
		}
		r += c;
	}

	for (var i = 0; i < self.lb_lines.length; i++) {
		var l = self.lb_lines[i];

		for (var j = 0; j < l.length; j++) {
			if (l[j] === '\n') {
				commit();
				continue;
			}

			if (r && r.length >= self.width()) {
				commit();
				addc('~ ');
			}

			addc(l[j]);
		}

		commit();
	}

	var yoffset = 0;
	var roffset = 0;
	if (rendered.length < self.height()) {
		yoffset = self.height() - rendered.length;
	} else if (rendered.length > self.height()) {
		roffset = rendered.length - self.height();

		if (self.lb_roffset !== null) {
			if (self.lb_roffset >= roffset) {
				self.lb_roffset = null;
			} else {
				roffset = self.lb_roffset;
			}
		}

		self.lb_roffset_last = roffset;
	}

	for (var y = 0; y < self.height(); y++) {
		var rr = rendered[roffset + y];

		if (!rr) {
			break;
		}

		for (var x = 0; x < self.width(); x++) {
			if (x >= rr.length) {
				break;
			}

			self.chr(x, yoffset + y, rr[x]);
		}
	}
};

LogBox.prototype.offset = function
offset(off)
{
	mod_assert.number(off, 'off');
	mod_assert.ok(Math.floor(off) === off, 'off is integer');

	this.lb_roffset = Math.max(this.lb_roffset_last + off, 0);
	this._redo();
};

LogBox.prototype.moveto = function
moveto(pos)
{
	mod_assert.string(pos, 'pos');

	switch (pos) {
	case 'top':
		this.lb_roffset = 0;
		break;
	case 'bottom':
		this.lb_roffset = null;
		break;
	default:
		throw new Error('cannot move to unknown position: ' + pos);
	}

	this._redo();
};

LogBox.prototype.add = function
add(line)
{
	mod_assert.string(line, 'line');
	var self = this;

	/* var dt = new Date(); */

	/* self.lb_lines.push(dt.toISOString() + ': ' + line); */
	self.lb_lines.push(line);
	self._redo();
};

module.exports = {
	LogBox: LogBox
};
