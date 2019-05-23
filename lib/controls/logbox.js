'use strict';

var mod_assert = require('assert-plus');
var mod_term = require('ansiterm');
var mod_util = require('util');

var lib_draw = require('../draw');


function
LogBox(options)
{
	var self = this;

	lib_draw.Region.call(self, options);

	self.lb_lastw = -1;

	self.lb_lines = [];

	self.lb_rendered = [];
	self.lb_roffset = null;
	self.lb_roffset_last = 0;

	self._redo();
	self.on('resize', function () {
		self._redo();
	});
}
mod_util.inherits(LogBox, lib_draw.Region);

/*
 * Handle wrapping a single line.
 */
LogBox.prototype._renderLine = function
_renderLine(line, bw)
{
	var self = this;
	var rendered = self.lb_rendered;
	var rs = null;
	var rl = 0;

	function commit() {
		if (rs !== null) {
			rendered.push(rs);
		}
		rs = null;
		rl = 0;
	}

	function addc(c, w) {
		if (rs === null) {
			rs = '';
		}
		rs += c;
		rl += w;
	}

	function addg(g, w) {
		var dw = Math.max(w, 1);
		if (g === '\n') {
			commit();
			return;
		}

		if (rs !== null && rl + dw >= bw) {
			commit();
			addc('~ ', 2);
		}

		addc(g, dw);
	}

	mod_term.forEachGrapheme(line, addg);

	commit();
};

/*
 * Render all of the lines that we have to fit within the current width.
 */
LogBox.prototype._renderAll = function
_renderAll()
{
	var self = this;
	var bw = self.width();
	var lw = self.lb_lastw;

	/* Save for next time. */
	self.lb_lastw = bw;

	if (bw === lw) {
		/*
		 * The width hasn't changed at all, so we don't need to rewrap
		 * any lines.
		 */
		return;
	}

	self.lb_rendered = [];

	for (var i = 0; i < self.lb_lines.length; i++) {
		self._renderLine(self.lb_lines[i], bw);
	}

	return;
};

LogBox.prototype._redo = function
_redo()
{
	var self = this;

	self._renderAll();

	var rendered = self.lb_rendered;
	var height = self.height();
	var nlines = rendered.length;

	var yoffset = 0;
	var roffset = 0;

	if (nlines < height) {
		yoffset = height - nlines;
	} else if (nlines > height) {
		roffset = nlines - height;

		if (self.lb_roffset !== null) {
			if (self.lb_roffset >= roffset) {
				self.lb_roffset = null;
			} else {
				roffset = self.lb_roffset;
			}
		}

		self.lb_roffset_last = roffset;
	}

	self.clear();

	for (var y = 0; y < self.height(); y++) {
		var rr = rendered[roffset + y];

		if (!rr) {
			break;
		}

		self.str(0, yoffset + y, rr);
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

	self.lb_lines.push(line);
	self._renderLine(line, self.width());

	self._redo();
};

module.exports = {
	LogBox: LogBox
};
