import { gutter, GutterMarker } from '@codemirror/view';

class RelNumberMarker extends GutterMarker {
  constructor(text, current) {
    super();
    this.text = text;
    this.current = current;
    this.elementClass = current ? 'cm-relLine-current' : '';
  }

  eq(other) {
    return this.text === other.text && this.current === other.current;
  }

  toDOM() {
    return document.createTextNode(this.text);
  }
}

function maxLineNumber(lines) {
  let last = 9;
  while (last < lines) last = last * 10 + 9;
  return last;
}

function cursorLineNumber(state) {
  return state.doc.lineAt(state.selection.main.head).number;
}

function markerFor(lineNo, cursorLine) {
  const current = lineNo === cursorLine;
  const text = current ? String(lineNo) : String(Math.abs(cursorLine - lineNo));
  return new RelNumberMarker(text, current);
}

export const relativeLineNumbers = gutter({
  class: 'cm-lineNumbers',
  renderEmptyElements: false,
  lineMarker(view, line) {
    const lineNo = view.state.doc.lineAt(line.from).number;
    return markerFor(lineNo, cursorLineNumber(view.state));
  },
  lineMarkerChange(update) {
    return cursorLineNumber(update.startState) !== cursorLineNumber(update.state);
  },
  initialSpacer(view) {
    return new RelNumberMarker(String(maxLineNumber(view.state.doc.lines)), false);
  },
  updateSpacer(spacer, update) {
    const max = String(maxLineNumber(update.view.state.doc.lines));
    return spacer.text === max ? spacer : new RelNumberMarker(max, false);
  },
});
