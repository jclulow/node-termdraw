'use strict';

var mod_assert = require('assert-plus');
var mod_util = require('util');

var lib_draw = require('../draw');
var lib_boxdraw = require('../boxdraw');

var format_label = lib_boxdraw.format_label;

function opts2rc(options, name) {
	mod_assert.object(options, name);
	mod_assert.object(options.child, name + '.child');
	mod_assert.optionalString(options.label, name + '.label');
	mod_assert.optionalNumber(options.fixed, name + '.fixed');
	mod_assert.optionalNumber(options.weight, name + '.weight');

	var rc = {
		rc_off: [ 0, 0 ],
		rc_dims: [ 0, 0 ],
		rc_label: options.label || null,
		rc_fixed: options.fixed || null,
		rc_weight: options.weight || 1,
		rc_region: options.child
	};

	return (rc);
}

function opts2rcs(children, name) {
	var arr = new Array(children.length);

	for (var i = 0; i < children.length; ++i) {
		arr[i] = opts2rc(children[i], name + '[' + i + ']');
	}

	return (arr);
}

function
Layout(axis, options)
{
	var self = this;
	var children = [];

	if (Array.isArray(options.children)) {
		children = opts2rcs(options.children, 'options.children');
	}

	lib_draw.Region.call(self, {
		width: options.width,
		height: options.height
	});

	self.on('resize', function () {
		self._redo();
	});

	self.lay_axis = axis;
	self.lay_bold = !!options.bold;
	self.lay_border = !!options.border;
	self.lay_children = children;

	self._redo();
}
mod_util.inherits(Layout, lib_draw.Region);

/*
 * Resize any children Regions, and redraw the Layout's borders if needed.
 */
Layout.prototype._redo = function
_redo()
{
	var self = this;
	var rc, off, i;

	var box = self.lay_bold ? lib_boxdraw.BOX_DRAW_BOLD :
	    lib_boxdraw.BOX_DRAW_NORMAL;
	var line = [ box.horiz, box.verti ];
	var sep1 = [ box.vertileft, box.horiztop ];
	var sep2 = [ box.vertiright, box.horizbottom ];

	var height = self.height();
	var width = self.width();
	var dims = [ width, height ];
	var axis1 = self.lay_axis;
	var axis2 = 1 - self.lay_axis;

	var border = self.lay_border ? 1 : 0;

	self.clear();

	/*
	 * Determine how tall the fixed height boxes are, and how many units of
	 * variable height weight exist.
	 */
	var fxcells = 0;
	var weights = 0;
	var max_weighted_idx = null;
	var fixed_remainder = 0;
	for (i = 0; i < self.lay_children.length; i++) {
		rc = self.lay_children[i];

		if (rc.rc_fixed) {
			fxcells += rc.rc_fixed;
			fixed_remainder += rc.rc_fixed + border;
 		} else if (rc.rc_weight) {
			max_weighted_idx = i;
			fixed_remainder = 0;

			weights += rc.rc_weight;
		} else {
			max_weighted_idx = i;
			fixed_remainder = 0;

			weights += 1;
		}
	}

	var cells_per_weight = (dims[axis2] - border - fxcells -
	    (border * self.lay_children.length)) / weights;
	if (cells_per_weight < 0) {
		cells_per_weight = 0;
	}

	/*
	 * Draw outer borders:
	 */
	var fmt = {};
	if (self.lay_border) {
		self.chr(0, 0, box.topleft, fmt);
		self.chr(width - 1, 0, box.topright, fmt);
		self.chr(0, height - 1, box.bottomleft, fmt);
		self.chr(width - 1, height - 1, box.bottomright, fmt);

		for (var x = 1; x < width - 1; x++) {
			self.chr(x, 0, box.horiz, fmt);
			self.chr(x, height - 1, box.horiz, fmt);
		}
		for (var y = 1; y < height - 1; y++) {
			self.chr(0, y, box.verti, fmt);
			self.chr(width - 1, y, box.verti, fmt);
		}
	}

	var weight;
	for (off = 0, i = 0; i < self.lay_children.length; i++) {
		rc = self.lay_children[i];
		weight = rc.rc_weight || 1;

		rc.rc_dims[axis1] = dims[axis1] - 2 * border;
		if (rc.rc_dims[axis1] < 0) {
			rc.rc_dims[axis1] = 0;
		}

		rc.rc_off[axis1] = border;
		rc.rc_off[axis2] = off + border;

		if (rc.rc_fixed) {
			rc.rc_dims[axis2] = rc.rc_fixed;
		} else {
			rc.rc_dims[axis2] =
			    Math.floor(weight * cells_per_weight);

			if (i === max_weighted_idx) {
				/*
				 * If this is the last weighted row/column,
				 * then this is where we need to insert any
				 * slop due to rounding errors. Determine
				 * whether there is more space remaining than
				 * the remaining fixed height/width require and
				 * compensate accordingly:
				 */
				var remc = dims[axis2] - border - off -
				    (rc.rc_dims[axis2] + border) -
				    fixed_remainder;
				if (remc > 0) {
					rc.rc_dims[axis2] += remc;
				}
			}
		}

		off += rc.rc_dims[axis2] + border;

		rc.rc_region.resize(rc.rc_dims[0], rc.rc_dims[1]);

		if (!self.lay_border) {
			/*
			 * If we're not drawing a border, then we can continue
			 * onto the next child region.
			 */
			continue;
		}

		if (i > 0) {
			/*
			 * Draw the boundary line to separate the current child
			 * region from the last one.
			 */
			var pos = [ 0, 0 ];

			pos[axis2] = rc.rc_off[axis2] - 1;

			self.chr(pos[0], pos[1], sep1[axis1], fmt);

			pos[axis1] = 1;

			for (; pos[axis1] < dims[axis1] - 1; pos[axis1]++) {
				self.chr(pos[0], pos[1], line[axis1], fmt);
			}

			self.chr(pos[0], pos[1], sep2[axis1], fmt);
		}

		if (rc.rc_label) {
			self.str(rc.rc_off[0] + 1, rc.rc_off[1] - 1,
			    format_label(rc.rc_label, rc.rc_dims[0]));
		}
	}
};

Layout.prototype.set_children = function _set_children(children) {
	mod_assert.array(children, 'children');

	this.lay_children = opts2rcs(children, 'children');
	this._redo();
};

Layout.prototype.pop = function pop() {
	this.lay_children.pop();
	this._redo();
};

Layout.prototype.shift = function shift() {
	this.lay_children.shift();
	this._redo();
};

Layout.prototype.push = function push(child, options) {
	mod_assert.object(child, 'child');
	mod_assert.optionalObject(options, 'options');

	if (!options) {
		options = {};
	}

	options.child = child;

	this.lay_children.push(opts2rc(options, 'options'));
	this._redo();
};

Layout.prototype.unshift = function unshift(child, options) {
	mod_assert.object(child, 'child');
	mod_assert.optionalObject(options, 'options');

	if (!options) {
		options = {};
	}

	options.child = child;

	this.lay_children.unshift(opts2rc(options, 'options'));
	this._redo();
};

Layout.prototype.splice = function splice() {
	var arr = new Array(arguments.length);

	switch (arguments.length) {
	default:
		for (var i = 2; i < arguments.length; ++i) {
			arr[i] = opts2rc(arguments[i], 'arguments[' + i + ']');
		}
		/* falls through */
	case 2:
		arr[1] = arguments[1];
		mod_assert.number(arr[1], 'deleteCount');
		/* falls through */
	case 1:
		arr[0] = arguments[0];
		mod_assert.number(arr[0], 'start');
		break;
	case 0:
		break;
	}

	Array.prototype.splice.apply(this.lay_children, arr);

	this._redo();
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

		chint.hint_y0 += rc.rc_off[1];
		chint.hint_y1 += rc.rc_off[1];

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
		var rcx = x - rc.rc_off[0];
		var rcy = y - rc.rc_off[1];

		if (rcx < 0 || rcy < 0 || rcx >= rc.rc_dims[0] ||
		    rcy >= rc.rc_dims[1]) {
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
				x: cursor.x + rc.rc_off[0],
				y: cursor.y + rc.rc_off[1]
			});
		}
	}

	return (null);
};

/*
 * Place the child Regions next to each other along the horizontal axis,
 * so that they're all the same width.
 */
function HLayout(options) {
	mod_assert.object(options, 'options');

	Layout.call(this, 0, options);
}
mod_util.inherits(HLayout, Layout);

/*
 * Place the child Regions next to each other along the vertical axis,
 * so that they're all the same height.
 */
function VLayout(options) {
	mod_assert.object(options, 'options');

	Layout.call(this, 1, options);
}
mod_util.inherits(VLayout, Layout);

module.exports = {
	VLayout: VLayout,
	HLayout: HLayout
};
