'use strict';

var mod_draw = require('../');

var draw = new mod_draw.Draw({});
var menu = new mod_draw.Region({});
menu.on('resize', redrawMenu);

var main = {
	title: 'Main Menu',
	submenus: [
		{
			title: 'Example 1',
			submenus: [
				{ title: 'Do thing for ex 1' },
				{ title: 'Do another thing for ex 1' },
				{ title: 'Wow, a third thing for ex 1!' }
			]
		},
		{
			title: 'Example 2',
			submenus: [
				{ title: 'Hello there!' },
				{ title: 'These are Example 2 things' },
				{ title: 'So cool!' }
			]
		},
		{
			title: 'Example 3',
			submenus: [
				{ title: 'Item A' },
				{ title: 'Item B' },
				{ title: 'Item C' }
			]
		}
	]
};

var curr = null;
var idx = 0;

// --- Basic UI elements and logic

var screen, mbox;

var top = new mod_draw.controls.ContentBox({
	format: { bold: true },
	content: '[F1 Main Menu] [F2 Exit]'
});

var bottom = new mod_draw.controls.ContentBox({
	format: { bold: true },
	content: ''
});

function warn(s) {
	bottom.set_content(s);
	redraw();
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

draw.on('resize', resize);

// --- Menu UI logic

function redrawMenu() {
	menu.clear();

	for (var i = 0; i < curr.submenus.length; i++) {
		menu.str(0, i, curr.submenus[i].title,
		    { inverse: (i === idx) });
	}

	setImmediate(redraw);
}

function selectMenu(m) {
	if (!Array.isArray(m.submenus) || m.submenus.length === 0) {
		warn('No submenus for "' + m.title + '"');
		return;
	}

	curr = m;
	idx = 0;

	mbox = new mod_draw.controls.Box({
		title: curr.title,
		child: menu
	});
	screen = new mod_draw.controls.HLayout({
		height: draw.height(),
		width: draw.width()
	});

	screen.push(top, { fixed: 1 });
	screen.push(mbox, { weight: 1 });
	screen.push(bottom, { fixed: 1 });

	redrawMenu();
}

function selectIdx(next) {
	if (next < 0) {
		next = curr.submenus.length - 1;
	} else if (next >= curr.submenus.length) {
		next = 0;
	}

	idx = next;

	redrawMenu();
}

// Initialize the menu.
selectMenu(main);
resize();

// --- Keyboard Events

draw.on('special', function (name) {
	switch (name) {
	case 'F1':
		selectMenu(main);
		break;
	case 'F2':
		quit(0);
		break;
	case 'up':
		selectIdx(idx - 1);
		break;
	case 'down':
		selectIdx(idx + 1);
		break;
	default:
		warn('No action for ' + name);
		break;
	}
});

draw.on('keypress', function (k) {
	warn('User typed: ' + JSON.stringify(k));
});

draw.on('control', function (info) {
	switch (info.key) {
	case '^C':
		quit(0);
		break;
	case '^J':
	case '^M':
		selectMenu(curr.submenus[idx]);
		break;
	case '^L':
		warn('');
		redraw(true);
		break;
	default:
		warn('No action for ' + info.key);
		break;
	}
});
