'use strict';

var mod_term = require('ansiterm');
var mod_util = require('util');
var mod_events = require('events');

var mod_assert = require('assert-plus');

var lib_cell = require('./cell');

function
Region(options)
{
	var self = this;

	mod_events.EventEmitter.call(self);

	mod_assert.optionalObject(options, 'options');
	if (options) {
		mod_assert.optionalNumber(options.width, 'options.width');
		mod_assert.optionalNumber(options.height, 'options.height');

		if (options.width) {
			self.r_width = options.width;
		}
		if (options.height) {
			self.r_height = options.height;
		}
	}

	if (!self.r_width) {
		self.r_width = 1;
	}
	if (!self.r_height) {
		self.r_height = 1;
	}


	self.r_hints = [];

	self.r_rows = [];
	while (self.r_rows.length < self.r_height) {
		var col = [];

		while (col.length < self.r_width) {
			col.push(new lib_cell.Cell());
		}

		self.r_rows.push(col);
	}
}
mod_util.inherits(Region, mod_events.EventEmitter);

Region.prototype.pop_hint = function
pop_hint()
{
	var self = this;

	return (self.r_hints.length === 0 ? null : self.r_hints.pop());
};

Region.prototype._shift_rows = function
_shift_rows(y0, y1, n)
{
	var self = this;
	var rows = [];

	var df = y1 - y0;
	var an = Math.min(df, Math.abs(n));
	var src = 0;
	var dst = 0;

	while (src < y0) {
		rows[dst++] = self.r_rows[src++];
	}

	if (n > 0) {
		/*
		 * We're shifting up, so skip the top rows and copy until y1.
		 */
		src = y0 + an;
		while (src <= y1) {
			rows[dst++] = self.r_rows[src++];
		}
	}

	for (var i = 0; i < an; ++i) {
		/* Insert the newly visible rows. */
		rows[dst] = new Array(self.r_width);

		for (var j = 0; j < self.r_width; ++j) {
			rows[dst][j] = new lib_cell.Cell();
		}

		dst += 1;
	}

	if (n < 0) {
		/* We're shifting down, so copy up to the dropped rows. */
		while (src <= y1 - an) {
			rows[dst++] = self.r_rows[src++];
		}

		src = y1 + 1;
	}

	while (src < self.r_rows.length) {
		/* Copy anything that's left. */
		rows[dst++] = self.r_rows[src++];
	}

	self.r_rows = rows;

	mod_assert.arrayOfObject(self.r_rows, 'r_rows');
	mod_assert.equal(self.r_rows.length, self.r_height);
};

Region.prototype.shift_rows = function
shift_rows(y0, y1, n)
{
	mod_assert.number(y0, 'y0');
	mod_assert.number(y1, 'y1');
	mod_assert.number(n, 'n');

	var self = this;

	/* Pin the ranges */
	y0 = Math.max(y0, 0);
	y1 = Math.min(y1, self.r_height - 1);

	if (n === 0) {
		return;
	}

	var prevhint = self.r_hints[self.r_hints.length - 1];
	var width = self.width();

	if (prevhint &&
	    prevhint.hint_width === width &&
	    prevhint.hint_y0 === y0 &&
	    prevhint.hint_y1 === y1) {
		prevhint.hint_n += n;
	} else {
		self.r_hints.push({
			hint_width: width,
			hint_y0: y0,
			hint_y1: y1,
			hint_n: n
		});
	}

	self._shift_rows(y0, y1, n);
};

Region.prototype.get_cell = function
get_cell(x, y)
{
	var self = this;

	if (x >= self.width() || y >= self.height()) {
		return (null);
	}

	return (self.r_rows[y][x]);
};

Region.prototype.get_cursor = function
get_cursor()
{
	return (null);
};

Region.prototype.resize = function
resize(w, h)
{
	var self = this;

	mod_assert.number(w, 'w');
	mod_assert.number(h, 'h');

	mod_assert.ok(w >= 0, 'w >= 0');
	mod_assert.ok(h >= 0, 'h >= 0');

	if (self.height() === h && self.width() === w) {
		return;
	}

	self.r_hints = [];

	self.r_height = h;
	self.r_width = w;

	while (self.r_rows.length !== self.r_height) {
		if (self.r_rows.length < self.r_height) {
			self.r_rows.push([]);
		} else {
			self.r_rows.pop();
		}
	}

	for (var i = 0; i < self.r_rows.length; i++) {
		var col = self.r_rows[i];

		while (col.length !== self.r_width) {
			if (col.length < self.r_width) {
				col.push(new lib_cell.Cell());
			} else {
				col.pop();
			}
		}
	}

	self.emit('resize');
};

Region.prototype.height = function
height()
{
	var self = this;

	mod_assert.number(self.r_height, 'self.r_height');
	return (self.r_height);
};

Region.prototype.width = function
width()
{
	var self = this;

	mod_assert.number(self.r_width, 'self.r_width');
	return (self.r_width);
};

Region.prototype.clear = function
clear()
{
	var self = this;

	for (var y = 0; y < self.r_rows.length; y++) {
		for (var x = 0; x < self.r_rows[y].length; x++) {
			self.r_rows[y][x].clear();
		}
	}
};

Region.prototype._chr = function
_chr(x, y, ch, w, format)
{
	var self = this;

	if (x < 0 || y < 0 || x >= self.width() || y >= self.height()) {
		return (0);
	}

	var c = self.r_rows[y][x];
	mod_assert.ok(c instanceof lib_cell.Cell, 'is a Cell');

	c.clear();
	if (format) {
		c.format(format);
	}

	return (c._chr(ch, w));
};

Region.prototype.chr = function
chr(x, y, ch, format)
{
	mod_assert.string(ch, 'ch');
	mod_assert.notEqual(ch.length, 0);

	return (this._chr(x, y, ch, mod_term.wcswidth(ch), format));
};

Region.prototype.str = function
str(x, y, st, format)
{
	var self = this;
	var ox = x;

	mod_assert.string(st, 'st');

	mod_term.forEachGrapheme(st, function (g, w) {
		x += self._chr(x, y, g, w, format);
	});

	return (x - ox);
};

Region.prototype.vstr = function
vstr(x, y, st, format)
{
	var self = this;
	var oy = y;

	mod_assert.string(st, 'st');

	mod_term.forEachGrapheme(st, function (g, w) {
		if (self._chr(x, y, g, w, format) !== 0) {
			y += 1;
		}
	});

	return (y - oy);
};


module.exports = {
	Region: Region
};
