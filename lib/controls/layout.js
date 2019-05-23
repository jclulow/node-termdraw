'use strict';

var mod_assert = require('assert-plus');
var mod_util = require('util');

var lib_draw = require('../draw');
var lib_boxdraw = require('../boxdraw');

function
Layout(options)
{
	var self = this;

	lib_draw.Region.call(self, {
		width: options.width,
		height: options.height
	});

	self.on('resize', function () {
		self._redo();
	});

	self.lay_bold = !!options.bold;
	self.lay_border = !!options.border;
	self.lay_children = [];
}
mod_util.inherits(Layout, lib_draw.Region);

Layout.prototype._redo = function
_redo()
{
	var self = this;
	var rc, x, y, i;

	var box = self.lay_bold ? lib_boxdraw.BOX_DRAW_BOLD :
	    lib_boxdraw.BOX_DRAW_NORMAL;

	var borderh = self.lay_border ? 1 : 0;
	var borderw = self.lay_border ? 1 : 0;

	self.clear();

	/*
	 * Determine how tall the fixed height boxes are, and how many units of
	 * variable height weight exist.
	 */
	var fhrows = 0;
	var weights = 0;
	var max_weighted_idx = null;
	var fixed_height_remainder = 0;
	for (i = 0; i < self.lay_children.length; i++) {
		rc = self.lay_children[i];

		if (rc.rc_fixed_height) {
			mod_assert.number(rc.rc_fixed_height,
			    'rc_fixed_height');

			fhrows += rc.rc_fixed_height;
			fixed_height_remainder += rc.rc_fixed_height + borderh;
 		} else if (rc.rc_weight) {
			mod_assert.number(rc.rc_weight, 'rc_weight');

			max_weighted_idx = i;
			fixed_height_remainder = 0;

			weights += rc.rc_weight;
		} else {
			max_weighted_idx = i;
			fixed_height_remainder = 0;

			weights += 1;
		}
	}

	var height_per_weight = (self.height() - borderh - fhrows -
	    (borderh * self.lay_children.length)) / weights;
	if (height_per_weight < 0) {
		height_per_weight = 0;
	}

	/*
	 * Draw outer borders:
	 */
	var fmt = {};
	if (self.lay_border) {
		self.chr(0, 0, box.topleft, fmt);
		self.chr(self.width() - 1, 0, box.topright, fmt);
		self.chr(0, self.height() - 1, box.bottomleft, fmt);
		self.chr(self.width() - 1, self.height() - 1, box.bottomright,
		    fmt);

		for (x = 1; x < self.width() - 1; x++) {
			/*
			 * The top line is drawn as part of the first component.
			 */
			self.chr(x, self.height() - 1, box.horiz, fmt);
		}
		for (y = 1; y < self.height() - 1; y++) {
			self.chr(0, y, box.verti, fmt);
			self.chr(self.width() - 1, y, box.verti, fmt);
		}
	}

	var weight;
	for (y = 0, i = 0; i < self.lay_children.length; i++) {
		rc = self.lay_children[i];
		weight = rc.rc_weight || 1;

		rc.rc_width = self.width() - 2 * borderw;
		if (rc.rc_width < 0) {
			rc.rc_width = 0;
		}

		rc.rc_x = borderw;
		rc.rc_y = y + borderh;
		if (rc.rc_fixed_height) {
			rc.rc_height = rc.rc_fixed_height;
		} else {
			rc.rc_height = Math.floor(weight * height_per_weight);

			if (i === max_weighted_idx) {
				/*
				 * If this is the last weighted row, then
				 * this is where we need to insert any slop
				 * due to rounding errors.  Determine whether
				 * there is more space remaining than the
				 * remaining fixed height rows require and
				 * compensate accordingly:
				 */
				var remh = self.height() - borderh - y -
				    (rc.rc_height + borderh) -
				    fixed_height_remainder;
				if (remh > 0) {
					rc.rc_height += remh;
				}
			}
		}

		rc.rc_region.resize(rc.rc_width, rc.rc_height);

		if (self.lay_border) {
			if (i > 0) {
				/*
				 * For each row after the first row, draw the
				 * border line above this row.
				 */
				self.chr(0, y, box.vertileft, fmt);
				self.chr(self.width() - 1, y, box.vertiright,
				    fmt);
			}

			for (x = 1; x < self.width() - 1; x++) {
				self.chr(x, y, box.horiz, fmt);
				self.chr(x, y, box.horiz, fmt);
			}

			if (rc.rc_label) {
				self.str(2, y, ' ' + rc.rc_label + ' ');
			}
		}

		y += rc.rc_height + borderh;
	}
};

Layout.prototype.add = function
add(child, options)
{
	var self = this;

	if (!options) {
		options = {};
	}

	self.lay_children.push({
		rc_x: 0,
		rc_y: 0,
		rc_height: 0,
		rc_width: 0,
		rc_label: options.label || null,
		rc_weight: options.weight || 1,
		rc_fixed_height: options.fixed_height || null,
		rc_region: child
	});

	self._redo();
};

Layout.prototype.pop_hint = function
pop_hint()
{
	var self = this;

	for (var i = 0; i < self.lay_children.length; i++) {
		var rc = self.lay_children[i];
		var chint;

		if ((chint = rc.rc_region.pop_hint()) === null) {
			continue;
		}

		chint.hint_y0 += rc.rc_y;
		chint.hint_y1 += rc.rc_y;

		if (self.lay_border) {
			/*
			 * If we have been laying a border, then all of the
			 * Cells on the left and right side are the same. It's
			 * okay for us to extend the hint width here so that we
			 * can perform an actual shift.
			 */
			chint.hint_width += 2;
		}

		return (chint);
	}

	return (lib_draw.Region.prototype.pop_hint.call(this));
};

Layout.prototype.get_cell = function
get_cell(x, y)
{
	var self = this;

	if (x >= self.width() || y >= self.height()) {
		return (null);
	}

	for (var i = 0; i < self.lay_children.length; i++) {
		var rc = self.lay_children[i];

		/*
		 * The child region may be offset from the parent.
		 */
		var rcx = x - rc.rc_x;
		var rcy = y - rc.rc_y;

		if (rcx < 0 || rcy < 0 || rcx >= rc.rc_width ||
		    rcy >= rc.rc_height) {
			continue;
		}

		var cc = rc.rc_region.get_cell(rcx, rcy);
		if (cc) {
			return (cc);
		}
	}

	return (lib_draw.Region.prototype.get_cell.call(this, x, y));
};

Layout.prototype.get_cursor = function
getCursor()
{
	var self = this;

	for (var i = 0; i < self.lay_children.length; i++) {
		var rc = self.lay_children[i];
		var cursor = rc.rc_region.get_cursor();
		if (cursor !== null) {
			return ({
				x: cursor.x + rc.rc_x,
				y: cursor.y + rc.rc_y
			});
		}
	}

	return (null);
};

module.exports = {
	Layout: Layout
};
