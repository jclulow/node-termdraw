'use strict';

var assert = require('assert-plus');
var mod_draw = require('../');
var mod_fs = require('fs');
var mod_path = require('path');
var mod_util = require('util');

var commands = [
	'[F1 Help]',
	'[F2 Menu]',
	'[F3 View]',
	'[F4 Edit]',
	'[F5 Copy]',
	'[F6 RenMov]',
	'[F7 Mkdir]',
	'[F8 Delete]',
	'[F9 PullDn]',
	'[F10 Quit]'
];

// --- File browsing logic

function FolderBrowser() {
	var self = this;

	self.pidx = 0;

	self.draw = new mod_draw.Draw({});
	self.draw.on('resize', function () {
		self.resize();
	});

	self.msgbar = new mod_draw.controls.ContentBox({
		format: { bold: true },
		content: ''
	});

	self.bottom = new mod_draw.controls.ContentBox({
		format: { bold: true },
		content: commands.join(' ')
	});

	self.panels = [
		new FolderPanel({ height: 0, width: 0, focused: true }),
		new FolderPanel({ height: 0, width: 0, focused: false })
	];

	self.browser = new mod_draw.controls.VLayout({
		border: true,
		children: [
			{ child: self.panels[0], label: self.panels[0].cwd() },
			{ child: self.panels[1], label: self.panels[1].cwd() }
		]
	});

	self.screen = new mod_draw.controls.HLayout({
		height: self.draw.height(),
		width: self.draw.width(),
		children: [
			{ child: self.browser },
			{ child: self.msgbar, fixed: 1 },
			{ child: self.bottom, fixed: 1 }
		]
	});

	self.draw.on('special', function (name, mods) {
		self.special(name, mods);
	});

	self.draw.on('keypress', function (k) {
		self.keypress(k);
	});

	self.draw.on('control', function (info) {
		self.control(info);
	});

	self.redraw();
}

FolderBrowser.start = function () {
	return (new FolderBrowser());
};

FolderBrowser.prototype.moveto = function moveto(pos) {
	this.panels[this.pidx].moveto(pos);
	this.redraw();
};

FolderBrowser.prototype.move = function move(n, wrap) {
	this.panels[this.pidx].move(n, wrap);
	this.redraw();
};

FolderBrowser.prototype.open = function open() {
	this.panels[this.pidx].open();
	this.browser.splice(this.pidx, 1, {
		child: this.panels[this.pidx],
		label: this.panels[this.pidx].cwd()
	});
	this.redraw();
};

FolderBrowser.prototype.redraw = function redraw(full) {
	this.draw.redraw(this.screen, full);
};

FolderBrowser.prototype.resize = function resize() {
	this.screen.resize(this.draw.width(), this.draw.height());
	this.redraw();
};

FolderBrowser.prototype.quit = function quit(code) {
	this.draw.close();
	process.exit(code);
};

FolderBrowser.prototype.warn = function warn(s) {
	this.msgbar.set_content(s);
	this.redraw();
};

FolderBrowser.prototype.toggle = function toggle() {
	this.panels[this.pidx].focused(false);
	this.pidx = 1 - this.pidx;
	this.panels[this.pidx].focused(true);
	this.redraw();
};

FolderBrowser.prototype.keypress = function keypress(k) {
	this.warn('User typed: ' + JSON.stringify(k));
};

FolderBrowser.prototype.control = function control(info) {
	switch (info.key) {
	case '^C':
		this.quit(0);
		break;
	case '^I':
		this.toggle();
		break;
	case '^J':
	case '^M':
		this.open();
		break;
	case '^L':
		this.warn('');
		this.redraw(true);
		break;
	default:
		this.warn('No action for ' + info.key);
		break;
	}
};

FolderBrowser.prototype.special = function special(name, mods) {
	switch (name) {
	case 'F1':
		this.warn('"Help" not supported');
		break;
	case 'F2':
		this.warn('"Menu" not supported');
		break;
	case 'F3':
		this.warn('"View" not supported');
		break;
	case 'F4':
		this.warn('"Edit" not supported');
		break;
	case 'F5':
		this.warn('"Copy" not supported');
		break;
	case 'F6':
		this.warn('"RenMov" not supported');
		break;
	case 'F7':
		this.warn('"Mkdir" not supported');
		break;
	case 'F8':
		this.warn('"Delete" not supported');
		break;
	case 'F9':
		this.warn('"PullDn" not supported');
		break;
	case 'F10':
		this.quit(0);
		break;
	case 'home':
		this.moveto('top');
		break;
	case 'end':
		this.moveto('bottom');
		break;
	case 'up':
		if (mods.shift) {
			this.move(-this.panels[this.pidx].height());
		} else {
			this.move(-1, true);
		}
		break;
	case 'down':
		if (mods.shift) {
			this.move(+this.panels[this.pidx].height());
		} else {
			this.move(+1, true);
		}
		break;
	default:
		this.warn('No action for ' + name);
		break;
	}
};

function FolderPanel(opts) {
	assert.object(opts, 'opts');
	assert.bool(opts.focused, 'opts.focused');

	var self = this;

	self.fp_cwd = process.cwd();
	self.fp_focused = opts.focused;
	self.fp_selected = 0;
	self.fp_viewtop = 0;
	self.fp_entries = self._open(self.fp_cwd);

	self.on('resize', function () {
		self._redo();
	});

	mod_draw.Region.call(self, opts);
}
mod_util.inherits(FolderPanel, mod_draw.Region);

FolderPanel.prototype._redo = function _redo() {
	var height = this.height();
	var entry, idx;

	this.clear();

	if (this.fp_selected < this.fp_viewtop) {
		this.fp_viewtop = this.fp_selected;
	} else if (this.fp_selected >= this.fp_viewtop + height) {
		this.fp_viewtop = this.fp_selected - height + 1;
	}

	for (var i = 0; i < height; i++) {
		idx = this.fp_viewtop + i;

		if (idx >= this.fp_entries.length) {
			break;
		}

		entry = this.fp_entries[idx];

		this.str(0, i, entry.name(),
		    { inverse: (this.fp_focused && idx === this.fp_selected) });
	}
};

FolderPanel.prototype._open = function _open(dir) {
	var dotdot = [ new FolderEntry(dir, '..') ];
	var entries = mod_fs.readdirSync(dir).map(function (file) {
		return (new FolderEntry(dir, file));
	});

	return (dotdot.concat(entries));
};

FolderPanel.prototype.open = function open() {
	var nwd = this.fp_entries[this.fp_selected];
	if (!nwd.stat().isDirectory()) {
		return;
	}

	this.fp_cwd = nwd.path();
	this.fp_entries = this._open(this.fp_cwd);
	this.fp_selected = 0;

	this._redo();
};

FolderPanel.prototype.moveto = function moveto(pos) {
	switch (pos) {
	case 'top':
		this.fp_selected = 0;
		break;
	case 'bottom':
		this.fp_selected = this.fp_entries.length - 1;
		break;
	default:
		throw new Error('cannot move to unknown position: ' + pos);
	}

	this._redo();
};

FolderPanel.prototype.move = function move(offset, wrap) {
	var sz = this.fp_entries.length;
	var n = this.fp_selected + offset;

	if (wrap) {
		this.fp_selected = (sz + n) % sz;
	} else if (n < 0) {
		this.fp_selected = 0;
	} else if (n >= this.fp_entries.length) {
		this.fp_selected = this.fp_entries.length - 1;
	} else {
		this.fp_selected = n;
	}

	this._redo();
};

FolderPanel.prototype.cwd = function cwd() {
	return (this.fp_cwd);
};

FolderPanel.prototype.focused = function focused(f) {
	this.fp_focused = f;
	this._redo();
};

function FolderEntry(dir, name) {
	this.fe_dir = dir;
	this.fe_name = name;
	this.fe_path = mod_path.join(dir, name);
	this.fe_stat = mod_fs.lstatSync(this.fe_path);
}

FolderEntry.prototype.name = function name() {
	return (this.fe_name);
};

FolderEntry.prototype.path = function path() {
	return (this.fe_path);
};

FolderEntry.prototype.stat = function stat() {
	return (this.fe_stat);
};

FolderBrowser.start();
