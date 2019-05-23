'use strict';

var mod_draw = require('../');
var mod_util = require('util');

var draw = new mod_draw.Draw({});
var screen = new mod_draw.Region({});
var start = Date.now();
var bounces = '0Oo.';
var bidx = 0;

screen.on('resize', drawLoading);

setInterval(function () {
	if (++bidx === bounces.length) {
		bidx = 0;
	}
}, 200);

function drawLoading() {
	var diff = Date.now() - start;
	var seconds = Math.floor(diff / 1000);
	var bounce = bounces.charAt(bidx);
	var str = mod_util.format(
	    '%s You\'ve been waiting %s seconds %s', bounce, seconds, bounce);
	screen.clear();
	var x = Math.floor((screen.width() - str.length) / 2);
	var y = Math.floor(screen.height() / 2);
	screen.str(x, y, str);
}

function redraw() {
	draw.redraw(screen);
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
	case '^Z':
		draw.suspend(screen);
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
