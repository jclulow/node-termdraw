'use strict';

var mod_draw = require('../');
var mod_util = require('util');

function SimpleTextBox(opts) {
	this.stb_lines = [ '' ];
	/*
	 * "offset" represents where we're positioned within the entered text,
	 * while "corner" represents where we start drawing. We move "corner"
	 * whenever the cursor would otherwise be displayed offscreen.
	 */
	this.stb_offset = {
		x: 0,
		y: 0
	};
	this.stb_corner = {
		x: 0,
		y: 0
	};

	this.on('resize', this._redo.bind(this));

	mod_draw.Region.call(this, opts);
}
mod_util.inherits(SimpleTextBox, mod_draw.Region);

/*
 * Redraw the contents of the text box. If we need to, we pick a new upper-left
 * corner to begin displaying the text from.
 */
SimpleTextBox.prototype._redo = function _redo() {
	var width = this.width();
	var height = this.height();
	var txt;

	this.clear();

	if (this.stb_offset.y < this.stb_corner.y) {
		/* We've moved above the visible region. */
		this.stb_corner.y = this.stb_offset.y;
	} else if (this.stb_offset.y >= this.stb_corner.y + height) {
		/* We've moved below the visible region. */
		this.stb_corner.y = this.stb_offset.y - height + 1;
	}

	if (this.stb_offset.x < this.stb_corner.x) {
		/* We've moved left of the visible region. */
		this.stb_corner.x = this.stb_offset.x;
	} else if (this.stb_offset.x >= this.stb_corner.x + width) {
		/* We've moved right of the visible region. */
		this.stb_corner.x = this.stb_offset.x - width + 1;
	}

	for (var i = 0; i < height; i++) {
		if (this.stb_corner.y + i >= this.stb_lines.length) {
			break;
		}

		txt = this.stb_lines[this.stb_corner.y + i];
		txt = txt.slice(this.stb_corner.x, this.stb_corner.x + width);

		this.str(0, i, txt);
	}
};

/*
 * Split the current line as needed, and move to the newly created line.
 */
SimpleTextBox.prototype.newline = function newline() {
	var line = this.stb_lines[this.stb_offset.y];
	var a = line.slice(0, this.stb_offset.x);
	var b = line.slice(this.stb_offset.x);

	this.stb_lines[this.stb_offset.y] = a;
	this.stb_lines.splice(this.stb_offset.y + 1, 0, b);

	this.stb_offset.x = 0;
	this.stb_offset.y = this.stb_offset.y + 1;

	this._redo();
};

/*
 * This handles the simple case where we press backspace somewhere in a line,
 * and just need to remove a character.
 */
SimpleTextBox.prototype._bsline = function _bsline() {
	/* Simple case within a line. */
	var line = this.stb_lines[this.stb_offset.y];
	var a = line.slice(0, this.stb_offset.x - 1);
	var b = line.slice(this.stb_offset.x);
	this.stb_lines[this.stb_offset.y] = a + b;
	this.stb_offset.x -= 1;
};

/*
 * This handles the case where we press backspace at the start of a line,
 * and need to join with the previous line.
 */
SimpleTextBox.prototype._bsjoin = function _bsjoin() {
	var prevl = this.stb_lines[this.stb_offset.y - 1];
	var currl = this.stb_lines[this.stb_offset.y];

	this.stb_lines.splice(this.stb_offset.y - 1, 2, prevl + currl);
	this.stb_offset.x = this.stb_lines[this.stb_offset.y - 1].length;
	this.stb_offset.y -= 1;
};

/*
 * Delete the previous character at the current cursor position.
 */
SimpleTextBox.prototype.backspace = function backspace() {
	if (this.stb_offset.x !== 0) {
		this._bsline();
	} else if (this.stb_offset.y !== 0) {
		this._bsjoin();
	}

	this._redo();
};

/*
 * Move the cursor horizontally.
 */
SimpleTextBox.prototype.moveX = function moveX(dir, wrap) {
	var noff = {
		x: this.stb_offset.x + dir,
		y: this.stb_offset.y
	};

	if (noff.x < 0) {
		if (!wrap) {
			noff.x = 0;
		} else if (this.stb_offset.y > 0) {
			/*
			 * We're at the start of a line, so we'll move to the
			 * end of the previous line.
			 */
			noff = {
				x: this.stb_lines[this.stb_offset.y - 1].length,
				y: this.stb_offset.y - 1
			};
		} else {
			noff = this.stb_offset;
		}
	} else if (noff.x > this.stb_lines[this.stb_offset.y].length) {
		if (!wrap) {
			noff.x = this.stb_lines[this.stb_offset.y].length;
		} else if (this.stb_offset.y < this.stb_lines.length - 1) {
			/*
			 * We're at the end of a line, so we'll move to the
			 * start of the next line.
			 */
			noff = {
				x: 0,
				y: this.stb_offset.y + 1
			};
		} else {
			noff = this.stb_offset;
		}
	}

	this.stb_offset = noff;

	this._redo();
};

/*
 * Move the cursor vertically.
 */
SimpleTextBox.prototype.moveY = function moveY(dir) {
	var noff = {
		x: this.stb_offset.x,
		y: this.stb_offset.y + dir
	};

	if (noff.y < 0) {
		noff.y = 0;
	} else if (noff.y >= this.stb_lines.length) {
		noff.y = this.stb_lines.length - 1;
	}

	if (noff.x > this.stb_lines[noff.y].length) {
		noff.x = this.stb_lines[noff.y].length;
	}

	this.stb_offset = noff;

	this._redo();
};

SimpleTextBox.prototype.type = function type(key) {
	var line = this.stb_lines[this.stb_offset.y];
	var left = line.slice(0, this.stb_offset.x);
	var right = line.slice(this.stb_offset.x);

	this.stb_lines[this.stb_offset.y] = left + key + right;
	this.stb_offset.x += 1;

	this._redo();
};

SimpleTextBox.prototype.get_cursor = function getCursor() {
	return {
		x: this.stb_offset.x - this.stb_corner.x,
		y: this.stb_offset.y - this.stb_corner.y
	};
};

function Editor() {
	var self = this;

	self.draw = new mod_draw.Draw({});

	self.box = new SimpleTextBox({});
	self.screen = new mod_draw.controls.Box({
		height: self.draw.height(),
		width: self.draw.width(),
		title: 'Enter your text!',
		child: this.box
	});

	self.draw.on('resize', function resize() {
		self.resize();
	});

	self.draw.on('keypress', function onKeypress(c) {
		self.keypress(c);
	});

	self.draw.on('special', function onSpecial(name, mods) {
		self.special(name, mods);
	});

	self.draw.on('control', function onControl(info) {
		self.control(info);
	});

	self.redraw();
}

Editor.prototype.redraw = function redraw(full) {
	this.draw.redraw(this.screen, full);
};

Editor.prototype.resize = function resize() {
	this.screen.resize(this.draw.width(), this.draw.height());
	this.redraw();
};

Editor.prototype.keypress = function redraw(c) {
	this.box.type(c);
	this.redraw();
};

Editor.prototype.special = function special(name, mods) {
	switch (name) {
	case 'left':
		if (mods.shift) {
			this.box.moveX(-Infinity);
		} else {
			this.box.moveX(-1, true);
		}
		break;
	case 'right':
		if (mods.shift) {
			this.box.moveX(+Infinity);
		} else {
			this.box.moveX(+1, true);
		}
		break;
	case 'up':
		if (mods.shift) {
			this.box.moveY(-this.box.height());
		} else {
			this.box.moveY(-1);
		}
		break;
	case 'down':
		if (mods.shift) {
			this.box.moveY(+this.box.height());
		} else {
			this.box.moveY(+1);
		}
		break;
	default:
		break;
	}

	this.redraw();
};

Editor.prototype.control = function control(info) {
	switch (info.key) {
	case '^C':
		this.quit(0);
		break;
	case '^A':
		this.box.moveX(-Infinity);
		break;
	case '^E':
		this.box.moveX(+Infinity);
		break;
	case '^?':
	case '^H':
		this.box.backspace();
		break;
	case '^J':
	case '^M':
		this.box.newline();
		break;
	case '^L':
		this.redraw(true);
		break;
	case '^Z':
		this.draw.suspend(this.screen);
		break;
	default:
		break;
	}

	this.redraw();
};

Editor.prototype.quit = function quit(code) {
	this.draw.close();
	process.exit(code);
};

Editor.start = function startEditor() {
	return new Editor();
};


// -- Run Editor

Editor.start();
