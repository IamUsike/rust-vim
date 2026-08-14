import { syntaxTree } from '@codemirror/language';
import { Decoration, ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const OPENERS = { '(': ')', '[': ']', '{': '}' };
const CLOSERS = { ')': '(', ']': '[', '}': '{' };
const IGNORE = /^(String|RawString|Char|LineComment|BlockComment|Comment|DocComment)$/;

const COLOR_COUNT = 6;
const marks = Array.from({ length: COLOR_COUNT }, (_, i) =>
  Decoration.mark({ class: `rb-bracket rb-bracket-${i}` }),
);

function ignoredRanges(state) {
  const ranges = [];
  syntaxTree(state).iterate({
    enter(node) {
      if (IGNORE.test(node.name)) {
        ranges.push({ from: node.from, to: node.to });
        return false;
      }
    },
  });
  return ranges;
}

function buildDecorations(state) {
  const ignored = ignoredRanges(state);
  const stack = [];
  const pairs = [];
  let ig = 0;

  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const text = line.text;

    for (let j = 0; j < text.length; j++) {
      const pos = line.from + j;

      while (ig < ignored.length && ignored[ig].to <= pos) ig++;
      if (ig < ignored.length && pos >= ignored[ig].from && pos < ignored[ig].to) {
        j += ignored[ig].to - pos - 1;
        continue;
      }

      const ch = text[j];
      if (OPENERS[ch]) {
        stack.push({ ch, pos, depth: stack.length });
      } else if (CLOSERS[ch]) {
        const expected = CLOSERS[ch];
        if (stack.length && stack[stack.length - 1].ch === expected) {
          const open = stack.pop();
          pairs.push({ from: open.pos, to: open.pos + 1, depth: open.depth });
          pairs.push({ from: pos, to: pos + 1, depth: open.depth });
        }
      }
    }
  }

  pairs.sort((a, b) => a.from - b.from || a.to - b.to);

  const builder = new RangeSetBuilder();
  for (const pair of pairs) {
    builder.add(pair.from, pair.to, marks[pair.depth % COLOR_COUNT]);
  }
  return builder.finish();
}

export const rainbowBrackets = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = buildDecorations(view.state);
    }

    update(update) {
      if (
        update.docChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = buildDecorations(update.state);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
