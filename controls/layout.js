#!/usr/bin/env node
/* vim: set ts=8 sts=8 sw=8 noet: */

var mod_assert = require('assert-plus');
var mod_util = require('util');

var lib_draw = require('../draw');
var lib_boxdraw = require('../lib/boxdraw');

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

	self.lay_bold = options.bold ? true : false;
	self.lay_border = options.border ? true : false;
}
mod_util.inherits(Layout, lib_draw.Region);

Layout.prototype._redo = function
_redo()
{
	var self = this;

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
	for (var i = 0; i < self.r_children.length; i++) {
		var rc = self.r_children[i];

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
	    (borderh * self.r_children.length)) / weights;

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

		for (var x = 1; x < self.width() - 1; x++) {
			/*
			 * The top line is drawn as part of the first component.
			 */
			self.chr(x, self.height() - 1, box.horiz, fmt);
		}
		for (var y = 1; y < self.height() - 1; y++) {
			self.chr(0, y, box.verti, fmt);
			self.chr(self.width() - 1, y, box.verti, fmt);
		}
	}

	var y = 0;
	for (var i = 0; i < self.r_children.length; i++) {
		var rc = self.r_children[i];
		var weight = rc.rc_weight || 1;
		var h;

		rc.rc_x = borderw;
		rc.rc_y = y + borderh;
		rc.rc_width = self.width() - 2 * borderw;
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

			for (var x = 1; x < self.width() - 1; x++) {
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

module.exports = {
	Layout: Layout
};
