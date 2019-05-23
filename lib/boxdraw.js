'use strict';

var BOX_DRAW_BOLD = {
	topleft: '\u250F',
	topright: '\u2513',
	bottomleft: '\u2517',
	bottomright: '\u251B',
	horiz: '\u2501',
	verti: '\u2503',
	vertileft: '\u2523',
	vertiright: '\u252B'
};

var BOX_DRAW_NORMAL = {
	topleft: '\u250C',
	topright: '\u2510',
	bottomleft: '\u2514',
	bottomright: '\u2518',
	horiz: '\u2500',
	verti: '\u2502',
	vertileft: '\u251C',
	vertiright: '\u2524'
};

function format_label(str, maxlen) {
	maxlen -= 4;

	if (maxlen <= 0) {
		return '';
	}

	if (str.length > maxlen) {
		if (maxlen > 3) {
			str = str.slice(0, maxlen - 3) + '...';
		} else {
			str = str[0];
			while (--maxlen > 0) {
				str += '.';
			}
		}
	}

	return (' ' + str + ' ');
}

module.exports = {
	format_label: format_label,
	BOX_DRAW_BOLD: BOX_DRAW_BOLD,
	BOX_DRAW_NORMAL: BOX_DRAW_NORMAL
};
