'use strict';

var assert = require('assert-plus');
var mod_draw = require('../');
var mod_term = require('ansiterm');

var wcswidth = mod_term.wcswidth;

var draw = new mod_draw.Draw({});
var surface = new mod_draw.Region({});
var screen = new mod_draw.controls.Box({
	title: 'foo',
	child: surface
});
var start = Date.now();

surface.on('resize', drawLoading);

var chars = [
	'e', 'e\u030A',
	'e', 'e\u0308',
	'e', 'e\u0301',
	'e', 'e\u030B',
	'e', 'e\u0300',
	'e', 'e\u030F'
];

function drawLoading() {
	var sw = surface.width();
	var sh = surface.height();
	var diff = Date.now() - start;
	var tim = Math.floor(diff / 500);
	var cidx = tim % chars.length;
	var desc = 'Pipe characters should line up:';
	var dx = Math.floor((sw - desc.length) / 2);
	var str = '|' + chars[cidx] + 'e|';
	var x = Math.floor((sw - wcswidth(str)) / 2);
	var y = Math.floor(sh / 2);
	surface.clear();
	assert.equal(surface.str(x, y - 3, '\u0000\u0001\u0002\u0011'), 4);
	assert.equal(surface.str(dx, y - 2, desc), desc.length);
	assert.equal(surface.str(x, y - 1, '|\uD83D\uDE00|'), 4);
	assert.equal(surface.str(x, y + 0, str), 4);
	assert.equal(surface.str(x, y + 1, '|\u2693|'), 4);
	assert.equal(surface.str(x, y + 2, '|  |'), 4);
	if (tim % 2) {
		assert.equal(surface.chr(x + 1, y + 2, '\uff28'), 2);
	} else {
		assert.equal(surface.chr(x + 1, y + 2, 'e'), 1);
	}

	/* Draw "hello" vertically along the right. */
	var mov = Math.floor(diff / 125);
	x = mov % sw;
	y = mov % sh;
	assert.equal(surface.vstr(x, y, 'hello'), (y + 4) >= sh ? sh - y : 5);
}

function redraw(full) {
	draw.redraw(screen, full);
}

function resize() {
	screen.resize(draw.width(), draw.height());
	redraw();
}

function quit(code) {
	draw.close();
	process.exit(code);
}

draw.on('keypress', function (k) {
	if (k === 'q') {
		quit(0);
	}
});

draw.on('control', function (info) {
	switch (info.key) {
	case '^C':
		quit(0);
		break;
	case '^L':
		redraw(true);
		break;
	default:
		break;
	}
});

draw.on('resize', resize);
resize();

setInterval(function () {
	drawLoading();
	redraw();
}, 100);
