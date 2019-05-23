# termdraw

## About

`termdraw` is a library for creating TUI (terminal user interface) applications.

## Installation

    npm install termdraw

## `new Draw(opts)`

The `Draw` object is your portal to the terminal: through it, you can you learn
the terminal's dimensions, the user's keypresses, and redraw the cells when
needed. The `Draw` object keeps track of the current state of each cell on the
screen for your program, and rewrites only the changed parts when you inform it
what you want the screen to look like.

`Draw` will also emit the following events when the underlying
[`ANSITerm`](https://github.com/jclulow/node-ansiterm/) fires them:

- `"resize"`, indicating that the terminal has been resized.
- `"keypress"`, indicating that a normal key has been typed
- `"control"`, indicating that a control character (i.e., `^C` or `^J`) has been
  typed.
- `"special"`, indicating that a special key (i.e. `F1` or the left arrow key)
  has been typed.

See the [node-ansiterm](https://github.com/jclulow/node-ansiterm/tree/v1.1.0)
documentation for more details on these events.

### `Draw#close()`

Restore the terminal to its state from before initializing `Draw`. The consuming
application should make sure to call this before exiting, so that the users can
return to a normal terminal state.

### `Draw#bell()`

Ring the terminal bell.

### `Draw#height()`

Fetch the number of terminal rows.

### `Draw#width()`

Fetch the number of terminal columns.

### `Draw#redraw(screen, refresh)`

Redraw the terminal to match `screen`. Normally `Draw` uses its knowledge about
the expected cell states to efficiently redraw the terminal, but messages
written to `stdout` or `stderr` (by misbehaving libraries or child processes)
may cause display issues. In this case, the optional boolean `refresh` can be
passed to force a full redraw of the screen. Some applications may wish to bind
this behaviour to `^L`.

## `new Region(opts)`

A `Region` represents a grid of cells and their configured states.

### `Region#height()`

Fetch the number of rows contained within this `Region`.

### `Region#width()`

Fetch the number of columns contained within this `Region`.

### `Region#resize(w, h)`

Resizes this `Region` to be `w` columns wide, and `h` rows tall. Once the region
has been resized, the `"resize"` event will be emitted, allowing an opportunity
to write into newly introduced cells (after growing) or to account for truncated
cells (after shrinking).

If the size hasn't changed at all, then nothing is done and the `"resize"` event
is not fired.

### `Region#clear()`

Reset all of the cells within this `Region` to their default, empty state.

### `Region#get_cell(x, y)`

Gets the `Cell` offset horizontally by `x` and vertically by `y` within
this `Region`. If the offset lies outside of the `Region`, then this
method returns null.

### `Region#get_cursor()`

`Draw#redraw()` uses this method to determine where to place the terminal
cursor after it has finished updating the terminal. If the cursor should be
drawn, then this method returns an object containing `"x"` and `"y"`. If this
method returns `null`, then a cursor will not be drawn within the `Region`.

### `Region#chr(x, y, ch, format)`

Updates the cell at (x, y) to contain the character `ch`. The optional
`format` argument specifies how the cell should be formatted.

This method returns how many columns the written character will occupy within
the `Region`. For many characters, this will just be `1`. When writing wide
characters though (e.g. CJK characters and emoji), this will be `2`. When
writing to coordinates outside of the `Region`, this will return `0`.

### `Region#str(x, y, str, format)`

Writes the characters in `str` horizontally start at position (x, y). `format`
specifies attributes for each of the cells that the characters are written to.

This method returns how many columns the string will occupy within the `Region`.

### `Region#vstr(x, y, str, format)`

Writes the characters in `str` vertically start at position (x, y). `format`
specifies attributes for each of the cells that the characters are written to.

This method returns how many rows the string occupies within the `Region`.

## Controls

Several basic extensions of `Region` are available.

### `new Box(opts)`

The `Box` class draws a border with an optional title around a child `Region`.
Available options are:

- `"child"`, optionally specify the Region to be contained in the box
- `"title"`, the title to show inside the top border

#### `Box#set_child(region)`

Change the child `Region` of this box.

#### `Box#set_title(title)`

Set a new title for this box.

### `new ContentBox(opts)`

Creates a `Region` that will try to display as much of a given string as it
can, with no wrapping. This can be useful when you wish to display a static
string on the screen, but don't want to write any resizing logic to display
more of the string when space becomes available. Available options are:

- `"content"`, the content to display in this region
- `"format"`, how to format the content

#### `ContentBox#set_content(content)`

Updates the content displayed in this region.

#### `ContentBox#set_format(content)`

Updates the formatting of the content displayed in this region.

### `new FillBox(options)`

Creates a `Region` full of cells all displaying the same character. Available options are:

- `"character"`, the character to display (defaults to `" "`)
- `"format"`, optional formatting to apply to the cells

#### `FillBox#set_character(character)`

Sets a new character to display.

#### `FillBox#set_format(format)`

Applies a new format to all of the cells.

### `new LogBox()`

The `LogBox` class allows you to display and scroll through a series of lines.

#### `LogBox#add(line)`

Adds a new line to the box.

#### `LogBox#moveto(pos)`

Given one of `"top"` or `"bottom"`, scroll to the top or bottom of the log
respectively.

#### `LogBox#offset(n)`

Scrolls the view `n` lines down (when positive) or up (when negative).

### `new HLayout(opts)` / `new VLayout(opts)`

The `HLayout` and `VLayout` classes allows you to stack multiple `Region`
objects alongside each other. Available options are:

- `"border"`, will draw a border around each contained region
- `"bold"`, will draw a bolder border
- `"children"`, an initial collection of children for this layout; available options are:
  - `"child"`, the child `Region` to display
  - `"label"`, a title for `Layout` to draw in the top border.
  - `"weight"`, how many rows this `Region` should be allocated proportional to the others.
  - `"fixed"`, indicates that this `Region` should be given a fixed, maximum
    height or width (for `HLayout` and `VLayout` respectively). Takes
    precedence over any specified `"weight"`.

#### `*Layout#set_children(children)`

Given an array of `children` configurations (specified the same way as the
constructor's `"children"` option), replace all of the current child regions.

#### `*Layout#push(child, [opts])`

Add a new child `Region` to the end of this `Layout`. Possible options are the
same as those for `"children"`.

#### `*Layout#unshift(child, [opts])`

Add a new child `Region` to the beginning of this `Layout`. Possible options
are the same as those for `"children"`.

#### `*Layout#pop()`

Remove the last child `Region`.

#### `*Layout#shift()`

Remove the first child `Region`.

#### `*Layout#splice(start[, deleteCount[, [child1[, child2[, ...]]]]])`

This method behaves like `Array#splice()`, allowing consumers to remove
children, and possibly replace them with new ones.

## Examples

- [examples/loading.js](examples/loading.js): This example shows how to create a simple, animated splash screen.
- [examples/menu.js](examples/menu.js): This example shows how to create a program with an interactive menu.
- [examples/scrolling.js](examples/textbox.js): This example shows how to use the `LogBox`.
- [examples/textbox.js](examples/textbox.js): This example shows how to create a simple box for entering text.
- [examples/commander.js](examples/commander.js): This example shows how to create an [mc](https://en.wikipedia.org/wiki/Midnight_Commander)-like application.
- [examples/unicode.js](examples/unicode.js): This example demonstrates the behaviour of multi-column and multi-byte characters.

## License

ISC
