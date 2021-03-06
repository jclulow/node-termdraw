'use strict';

var mod_util = require('util');
var mod_events = require('events');

var mod_assert = require('assert-plus');
var mod_ansiterm = require('ansiterm');

var lib_cell = require('./cell');
var lib_region = require('./region');

var ESC = '\u001b';
var CSI = ESC + '[';


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
draw_region_shift(r, y0, y1, n)
{
	mod_assert.number(y0, 'y0');
	mod_assert.number(y1, 'y1');
	mod_assert.number(n, 'n');

	if (n === 0) {
		return ('');
	}

	/*
	 * Apply the update to the target region.
	 */
	r._shift_rows(y0, y1, n);

	/*
	 * Set the Scrolling Region to the set of lines we wish to shift up or
	 * down:
	 */
	var out = CSI + (y0 + 1) + ';' + (y1 + 1) + 'r';
	var t;

	if (n < 0) {
		n = -n;

		/*
		 * Move the cursor to the top line in the scrolling region.
		 */
		out += CSI + (y0 + 1) + 'H';
		for (t = 0; t < n; t++) {
			/*
			 * Reverse Index (RI) moves the cursor up one line in
			 * this column.  As we are at the top margin of the
			 * scrolling region, all of the text will move down one
			 * row for each RI.
			 */
			out += ESC + 'M';
		}
	} else {
		out += CSI + (y1 + 1) + 'H';
		for (t = 0; t < n; t++) {
			/*
			 * The Index (IND) operation is similar to Reverse
			 * Index, except it moves the cursor down -- text will
			 * thus move _up_ the screen.
			 */
			out += ESC + 'D';
		}
	}

	/*
	 * Reset the scrolling region to the entire terminal.
	 */
	out += CSI + 'r';

	return (out);
}

function
Draw(options)
{
	var self = this;

	mod_events.EventEmitter.call(self);

	mod_assert.optionalObject(options, 'options');

	self.draw_closed = false;

	self.draw_default = new lib_cell.Cell();

	self.draw_in = process.stdin;
	self.draw_term = new mod_ansiterm.ANSITerm({
		stdin: self.draw_in
	});
	self.draw_term.clear();
	self.draw_term.cursor(false);

	self.draw_term.on('keypress', function (ch) {
		if (self.draw_closed) {
			return;
		}

		self.emit('keypress', ch);
	});

	self.draw_term.on('control', function (ctrl) {
		if (self.draw_closed) {
			return;
		}

		self.emit('control', ctrl);
	});

	self.draw_term.on('special', function (name, mods) {
		if (self.draw_closed) {
			return;
		}

		self.emit('special', name, mods);
	});

	self.draw_term.on('resize', function (sz) {
		if (self.draw_closed) {
			return;
		}

		/*
		 * Create a new blank screen of the appropriate
		 * size.
		 */
		self.draw_term.clear();
		self.draw_screen = new lib_region.Region({
			width: sz.w,
			height: sz.h
		});

		self.emit('resize');
	});

	var sz = self.draw_term.size();
	self.draw_screen = new lib_region.Region({
		width: sz.w,
		height: sz.h
	});
}
mod_util.inherits(Draw, mod_events.EventEmitter);

Draw.prototype.close = function
close()
{
	var self = this;

	if (self.draw_closed) {
		return;
	}
	self.draw_closed = true;

	self.draw_term.softReset();
	self.draw_term.clear();
	self.draw_term.moveto(1, 1);
};

Draw.prototype.height = function
height()
{
	var self = this;

	return (self.draw_screen.height());
};

Draw.prototype.width = function
width()
{
	var self = this;

	return (self.draw_screen.width());
};

Draw.prototype.bell = function
bell()
{
	var self = this;

	if (self.draw_closed) {
		return;
	}

	this.draw_term.write('\u0007');
};

Draw.prototype.redraw = function
redraw(region, refresh)
{
	mod_assert.object(region, 'region');
	mod_assert.optionalBool(refresh, 'refresh');

	var self = this;
	var last_attr = null;
	var last_row = null;
	var last_col = null;
	var contig = false;

	if (self.draw_closed) {
		return;
	}

	var height = self.draw_screen.height();
	var width = self.draw_screen.width();

	var out = '';

	var hint;
	while ((hint = region.pop_hint()) !== null) {
		if (hint.hint_width !== width) {
			continue;
		}

		out += draw_region_shift(self.draw_screen, hint.hint_y0,
		    hint.hint_y1, hint.hint_n);
	}

	/*
	 * Draw every cell that has been updated:
	 */
	var redo = false;
	for (var y = 0; y < height; y++) {
		var x = 0;

		while (x < width) {
			var oc = self.draw_screen.get_cell(x, y);
			var nc = region.get_cell(x, y);

			mod_assert.object(oc, 'oc (' + x + ', ' + y + ')');

			if (!nc) {
				nc = self.draw_default;
			}

			if (!redo && oc.equals(nc) && !refresh) {
				contig = false;
				x += oc.c_w;
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
							x -= 1;
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

			if (last_attr === null) {
				last_attr = lib_cell.CELL_DEFAULT_ATTR;
				out += CSI + '0m';
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
			x += nc.c_w;

			contig = true;
			last_row = y;
			last_col = x - 1;

			/*
			 * Update our record of what has been drawn to the
			 * screen.
			 */
			oc.set_from(nc);
		}
	}

	if (out.length > 0) {
		self.draw_term.write(out);
	}

	var cursor = region.get_cursor();
	if (cursor !== null && cursor.x <= width && cursor.y <= height) {
		/*
		 * termdraw's upper-left corner is (0, 0), but in the actual
		 * terminal it is (1, 1).
		 */
		self.draw_term.cursor(true);
		self.draw_term.moveto(cursor.x + 1, cursor.y + 1);
	}
};

Draw.prototype.pause = function
pause(region, f)
{
	mod_assert.object(region, 'region');
	mod_assert.func(f, 'f');

	var self = this;

	self.draw_in.setRawMode(false);
	self.draw_in.pause();
	self.draw_term.softReset();
	self.draw_closed = true;

	f(function _afterPause() {
		self.draw_closed = false;
		self.draw_in.setRawMode(true);
		self.draw_in.resume();
		self.draw_term.clear();
		self.draw_term.cursor(false);

		/*
		 * Since node doesn't notice when we've been
		 * suspended/continued, we hack up a SIGWINCH
		 * to get back the current height/width, and
		 * then emit our "resize" event.
		 */
		process.emit('SIGWINCH');

		self.redraw(region, true);
	});
};

Draw.prototype.suspend = function
suspend(region)
{
	function doSuspend(restore) {
		process.kill(process.pid, 'SIGTSTP');
		setImmediate(restore);
	}

	this.pause(region, doSuspend);
};

module.exports = {
	Draw: Draw,
	Region: lib_region.Region
};
