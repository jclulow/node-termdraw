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
		f_rows: rows,
		f_used: false
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
}

Draw.prototype.width = function
width()
{
	var self = this;

	return (self.draw_screen.f_w);
}

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

	var out = CSI + '0m';

//	self.draw_term.reset();

	/*
	 * Draw every cell that has been updated:
	 */
	var redo = false;
	for (var y = 0; y < self.draw_screen.f_h; y++) {
		for (var x = 0; x < self.draw_screen.f_w; x++) {
			var oc = frame_cell_get(self.draw_screen, x, y);
			var nc = region.get_cell(x, y);

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
				//self.draw_term.moveto(x + 1, y + 1);
			}

			if (last_attr !== nc.c_attr) {
				var attr_out = [ 0 ];
				//out += CSI + '0m';
				//self.draw_term.reset();

				if (nc.c_attr & lib_cell.ATTR_BOLD) {
					attr_out.push(1);
					//out += CSI + '1m';
					//self.draw_term.bold();
				}
				if (nc.c_attr & lib_cell.ATTR_INVERSE) {
					attr_out.push(7);
					//out += CSI + '7m';
					//self.draw_term.reverse();
				}

				out += CSI + attr_out.join(';') + 'm';

				last_attr = nc.c_attr;
			}

			/*
			if (last_fg !== nc.c_fg) {
				self.draw_term.colour256(nc.c_fg,
				    false);
				last_fg = nc.c_fg;
			}
			if (last_bg !== nc.c_bg) {
				self.draw_term.colour256(nc.c_bg,
				    true);
				last_bg = nc.c_bg;
			}
			*/

			out += nc.c_c;
			//self.draw_term.write(nc.c_c);
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

	//self.draw_term.reset();
	//self.draw_term.uncork();
};

module.exports = {
	Draw: Draw,
	Region: lib_region.Region
};
