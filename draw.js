/* vim: set ts=8 sts=8 sw=8 noet: */

var mod_util = require('util');
var mod_events = require('events');

var mod_assert = require('assert-plus');
var mod_extsprintf = require('extsprintf');
var mod_ansiterm = require('ansiterm');
var mod_linedraw = require('ansiterm/lib/linedraw');

var sprintf = mod_extsprintf.sprintf;

var LD = mod_linedraw.utf8;

var lib_cell = require('./lib/cell');
var lib_region = require('./lib/region');

var FRAME_ID = 1;

var ESC = '\u001b';
var CSI = ESC + '[';


function
frame_cell_get(f, x, y)
{
	mod_assert.ok(x >= 0, 'x was negative (' + x + ')');
	mod_assert.ok(y >= 0, 'y was negative (' + y + ')');
	mod_assert.ok(y < f.f_h, 'y out of bounds (' + y + ' >= ' +
	    f.f_h + ')');
	mod_assert.ok(x < f.f_w, 'x out of bounds (' + x + ' >= ' +
	    f.f_w + ')');

	return (f.f_rows[y][x]);
}

function
frame_create_row(w)
{
	var row = [];

	while (row.length < w) {
		row.push(new lib_cell.Cell());
	}

	return (row);
}

/*
 * This function uses the Scrolling Region functionality of a video terminal to
 * shift a set of lines down the page without needing to redraw all of them.
 *
 * We set the scrolling region around the lines in question and perform the
 * (destructive) scroll.  Then, we update our memory of what's been drawn to
 * the terminal accordingly.  Next time we go to draw, the moved lines will not
 * be redrawn unless a subsequent operation further altered them.
 */
function
frame_region_shift(f, y0, y1, n)
{
	mod_assert.number(y0, 'y0');
	mod_assert.number(y1, 'y1');
	mod_assert.number(n, 'n');

	if (n === 0) {
		return '';
	}

	/*
	 * Set the Scrolling Region to the set of lines we wish to shift up or
	 * down:
	 */
	var out = CSI + (y0 + 1) + ';' + (y1 + 1) + 'r';

	if (n < 0) {
		n = -n;

		/*
		 * Move the cursor to the top line in the scrolling region.
		 */
		out += CSI + (y0 + 1) + 'H';
		for (var t = 0; t < n; t++) {
			/*
			 * Reverse Index (RI) moves the cursor up one line in
			 * this column.  As we are at the top margin of the
			 * scrolling region, all of the text will move down one
			 * row for each RI.
			 */
			out += ESC + 'M';
		}

		/*
		 * Trim the old rows from the bottom:
		 */
		f.f_rows.splice(y1, n);

		/*
		 * Add the new rows at the top:
		 */
		for (var t = 0; t < n; t++) {
			f.f_rows.splice(y0, 0, frame_create_row(f.f_w));
		}

	} else {
		out += CSI + (y1 + 1) + 'H';
		for (var t = 0; t < n; t++) {
			/*
			 * The Index (IND) operation is similar to Reverse
			 * Index, except it moves the cursor down -- text will
			 * thus move _up_ the screen.
			 */
			out += ESC + 'D';
		}

		/*
		 * Insert the new rows at the bottom:
		 */
		for (var t = 0; t < n; t++) {
			f.f_rows.splice(y1 + n, 0, frame_create_row(f.f_w));
		}

		/*
		 * Remove old rows from the top:
		 */
		f.f_rows.splice(y0, n);
	}

	/*
	 * Reset the scrolling region to the entire terminal.
	 */
	out += CSI + 'r';

	return (out);
}

function
frame_create(w, h)
{
	var rows = [];

	while (rows.length < h) {
		var col = [];

		while (col.length < w) {
			col.push(new lib_cell.Cell());
		}

		rows.push(col);
	}

	return ({
		f_id: FRAME_ID++,
		f_w: w,
		f_h: h,
		f_x: 0,
		f_y: 0,
		f_rows: rows
	});
}

function
frame_clear(f)
{
	for (var y = 0; y < f.f_h; y++) {
		for (var x = 0; x < f.f_w; x++) {
			f.f_rows[y][x].clear();
		}
	}
}

function
Draw(options)
{
	var self = this;

	mod_events.EventEmitter.call(self);

	mod_assert.object(options, 'options');

	self.draw_default = new lib_cell.Cell();

	self.draw_term = new mod_ansiterm.ANSITerm();
	self.draw_term.clear();
	self.draw_term.cursor(false);
	self.draw_term.on('keypress', function (key) {
		if (key === 'q'.charCodeAt(0)) {
			self.draw_term.clear();
			self.draw_term.moveto(1, 1);
			process.exit(0);
		}
	});
	self.draw_term.on('resize', function (sz) {
		self.draw_h = sz.h;
		self.draw_w = sz.w;

		/*
		 * Create a new blank screen of the appropriate
		 * size.
		 */
		self.draw_term.clear();
		self.draw_screen = frame_create(self.draw_w, self.draw_h);

		self.emit('resize');
	});

	var sz = self.draw_term.size();
	self.draw_h = sz.h;
	self.draw_w = sz.w;

	self.draw_screen = frame_create(self.draw_w, self.draw_h);
}
mod_util.inherits(Draw, mod_events.EventEmitter);

Draw.prototype.height = function
height()
{
	var self = this;

	return (self.draw_screen.f_h);
};

Draw.prototype.width = function
width()
{
	var self = this;

	return (self.draw_screen.f_w);
};

Draw.prototype.redraw = function
redraw(region)
{
	var self = this;
	var last_fg = lib_cell.CELL_DEFAULT_FG;
	var last_bg = lib_cell.CELL_DEFAULT_BG;
	var last_attr = lib_cell.CELL_DEFAULT_ATTR;
	var last_row = null;
	var last_col = null;
	var contig = false;

	var out = '';

	var hint;
	while ((hint = region.pop_hint()) !== null) {
		out += frame_region_shift(self.draw_screen, hint.hint_y0,
		    hint.hint_y1, hint.hint_n);
	}

	out += CSI + '0m';

	/*
	 * Draw every cell that has been updated:
	 */
	var redo = false;
	for (var y = 0; y < self.draw_screen.f_h; y++) {
		for (var x = 0; x < self.draw_screen.f_w; x++) {
			var oc = frame_cell_get(self.draw_screen, x, y);
			var nc = region.get_cell(x, y);

			mod_assert.object(oc, 'oc (' + x + ', ' + y + ')');

			if (!nc) {
				nc = self.draw_default;
			}

			if (!redo && oc.equals(nc)) {
				contig = false;
				continue;
			}
			redo = false;

			if (!contig) {
				/*
				 * We did not write to the previous character
				 * in this row.  Move the cursor into place.
				 */
				if (y === last_row) {
					if (last_col !== null) {
						var skip = x - last_col - 1;

						if (skip === 1) {
							/*
							 * We would be skipping
							 * just one character.
							 * It is generally more
							 * efficient to
							 * backtrack and just
							 * emit that character.
							 */
							redo = true;
							contig = true;
							x -= 2;
							continue;
						}

						/*
						 * Try a short relative jump to
						 * the right.
						 */
						out += CSI + skip + 'C';
					} else {
						/*
						 * Use an absolute column
						 * address.
						 */
						out += CSI + (x + 1) + 'G';
					}
				} else {
					/*
					 * Move to a specific cell.
					 */
					out += CSI + (y + 1) + ';' + (x + 1) +
					    'f';
				}
			}

			if (last_attr !== nc.c_attr) {
				var attr_out = [ 0 ];

				if (nc.c_attr & lib_cell.ATTR_BOLD) {
					attr_out.push(1);
				}
				if (nc.c_attr & lib_cell.ATTR_INVERSE) {
					attr_out.push(7);
				}

				out += CSI + attr_out.join(';') + 'm';

				last_attr = nc.c_attr;
			}

			out += nc.c_c;
			contig = true;
			last_row = y;
			last_col = x;

			/*
			 * Update our record of what has been drawn to the
			 * screen.
			 */
			oc.set_from(nc);
		}
	}

	out += CSI + '0m';

	self.draw_term.write(out);
};

module.exports = {
	Draw: Draw,
	Region: lib_region.Region
};
