/* vim: set ts=8 sts=8 sw=8 noet: */

var mod_assert = require('assert-plus');

var ATTR_BOLD = 0x01;
var ATTR_INVERSE = 0x02;
var ATTR_COLOUR_16 = 0x04;
var ATTR_COLOUR_256 = 0x08;

/*
 * "fg" and "bg" are colour numbers for the foreground and background colour of
 * a cell, respectively.  These colour spaces generally include 0 as a valid
 * colour, e.g. black.  The value -1 is used to represent the notion of a
 * return to the default colour, as if no particular colour preference had been
 * asserted.
 */

var CELL_DEFAULT_C = ' ';
var CELL_DEFAULT_ATTR = 0;
var CELL_DEFAULT_FG = -1;
var CELL_DEFAULT_BG = -1;

function
Cell(cell)
{
	var self = this;

	if (cell) {
		self.set_from(cell);
	} else {
		self.clear();
	}
}

Cell.prototype.clear = function
clear()
{
	var self = this;

	self.c_c = CELL_DEFAULT_C;
	self.c_attr = CELL_DEFAULT_ATTR;
	self.c_fg = CELL_DEFAULT_FG;
	self.c_bg = CELL_DEFAULT_BG;
};

Cell.prototype.chr = function
chr(ch)
{
	var self = this;

	mod_assert.string(ch, 'ch');
	mod_assert.strictEqual(ch.length, 1, 'must be one character');

	self.c_c = ch;
};

Cell.prototype.format = function
format(fmt)
{
	var self = this;

	mod_assert.object(fmt, 'fmt');
	mod_assert.optionalBool(fmt.bold, 'fmt.bold');
	mod_assert.optionalBool(fmt.inverse, 'fmt.inverse');
	mod_assert.optionalBool(fmt.reverse, 'fmt.reverse');

	self.c_attr = CELL_DEFAULT_ATTR;
	if (fmt.bold) {
		self.c_attr |= ATTR_BOLD;
	}
	if (fmt.inverse || fmt.reverse) {
		self.c_attr |= ATTR_INVERSE;
	}
};

Cell.prototype.set_from = function
set_from(cell)
{
	var self = this;

	mod_assert.ok(cell instanceof Cell, 'must be a Cell');

	self.c_c = cell.c_c;
	self.c_attr = cell.c_attr;
	self.c_fg = cell.c_fg;
	self.c_bg = cell.c_bg;
};

Cell.prototype.has_same_attrs = function
has_same_attrs(cell)
{
	var self = this;

	mod_assert.ok(cell instanceof Cell, 'must be a Cell');

	return (self.c_attr === cell.c_attr &&
	    self.c_fg === cell.c_fg &&
	    self.c_bg === cell.c_bg);
};

Cell.prototype.equals = function
equals(cell)
{
	var self = this;

	return (self.has_same_attrs(cell) && self.c_c === cell.c_c);
};

module.exports = {
	CELL_DEFAULT_C: CELL_DEFAULT_C,
	CELL_DEFAULT_ATTR: CELL_DEFAULT_ATTR,
	CELL_DEFAULT_FG: CELL_DEFAULT_FG,
	CELL_DEFAULT_BG: CELL_DEFAULT_BG,

	ATTR_BOLD: ATTR_BOLD,
	ATTR_INVERSE: ATTR_INVERSE,
	ATTR_COLOUR_16: ATTR_COLOUR_16,
	ATTR_COLOUR_256: ATTR_COLOUR_256,

	Cell: Cell
};
