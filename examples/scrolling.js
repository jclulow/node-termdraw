'use strict';

var mod_draw = require('../');
var mod_util = require('util');

var MSG = 'The time is now %s; your pangram is: %s';

var PANGRAMS = [
	'A wizard’s job is to vex chumps quickly in fog',
	'Amazingly few discotheques provide jukeboxes',
	'Back in June we delivered oxygen equipment of the same size',
	'Brick quiz whangs jumpy veldt fox',
	'By Jove, my quick study of lexicography won a prize',
	'Cozy sphinx waves quart jug of bad milk',
	'Fix problem quickly with galvanized jets',
	'Heavy boxes perform quick waltzes and jigs',
	'How razorback-jumping frogs can level six piqued gymnasts',
	'How vexingly quick daft zebras jump',
	'Jackdaws love my big sphinx of quartz',
	'Jived fox nymph grabs quick waltz',
	'My ex pub quiz crowd gave joyful thanks',
	'Pack my box with five dozen liquor jugs',
	'Pack my red box with five dozen quality jugs',
	'Quizzical twins proved my hijack-bug fix',
	'Sphinx of black quartz, judge my vow',
	'Sympathizing would fix Quaker objectives',
	'The five boxing wizards jump quickly',
	'The quick brown fox jumps over a lazy dog',
	'Twelve ziggurats quickly jumped a finch box',
	'Watch "Jeopardy!", Alex Trebek’s fun TV quiz game',
	'When zombies arrive, quickly fax Judge Pat',
	'Woven silk pyjamas exchanged for blue quartz'
];

var recent = [];
var draw = new mod_draw.Draw({});
var log = new mod_draw.controls.LogBox({});
var screen = new mod_draw.controls.Box({
	title: 'Random Pangram Printer',
	child: log
});

function random(max) {
	return Math.floor(Math.random() * max);
}

/**
 * Return a random element from the PANGRAM array that we have not seen in the
 * past three calls, to make sure it's easier to verify scrolling is working
 * and rendering correctly.
 */
function randomPangram() {
	do {
		var n = random(PANGRAMS.length);
	} while (recent.indexOf(n) !== -1);

	recent.push(n);

	while (recent.length > 3) {
		recent.shift();
	}

	return PANGRAMS[n];
}

function addTimestamp() {
	var pangram = randomPangram();
	var s = mod_util.format(MSG, new Date(), pangram);
	log.add(s);
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
	case '^Z':
		draw.suspend(redraw);
		break;
	default:
		break;
	}
});

draw.on('special', function (name, mods) {
	switch (name) {
	case 'home':
		log.moveto('top');
		break;
	case 'end':
		log.moveto('bottom');
		break;
	case 'up':
		if (mods.shift) {
			log.offset(-log.height());
		} else {
			log.offset(-1);
		}
		break;
	case 'down':
		if (mods.shift) {
			log.offset(+log.height());
		} else {
			log.offset(+1);
		}
		break;
	default:
		break;
	}
});

draw.on('resize', resize);
resize();

setInterval(function () {
	addTimestamp();
}, 500);

setInterval(redraw, 200);
