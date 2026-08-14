import './style.css';
import { EditorView, keymap, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { Compartment, EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { rust } from '@codemirror/lang-rust';
import { bracketMatching } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { vim, Vim, getCM } from '@replit/codemirror-vim';
import { rainbowBrackets } from './rainbowBrackets.js';
import { relativeLineNumbers } from './relativeLineNumbers.js';

// ---- Default code ----
const DEFAULT_CODE = `fn main() {
    println!("Hello, world!");
}
`;

// ---- Restore from localStorage or use default ----
function getInitialCode() {
  try {
    const saved = localStorage.getItem('rust-vim-playground-code');
    if (saved && saved.trim().length > 0) return saved;
  } catch (_) {}
  return DEFAULT_CODE;
}

function saveCode(code) {
  try {
    localStorage.setItem('rust-vim-playground-code', code);
  } catch (_) {}
}

const WRAP_STORAGE_KEY = 'rust-vim-playground-wrap';

function getInitialWrap() {
  try {
    return localStorage.getItem(WRAP_STORAGE_KEY) === '1';
  } catch (_) {}
  return false;
}

function saveWrap(enabled) {
  try {
    localStorage.setItem(WRAP_STORAGE_KEY, enabled ? '1' : '0');
  } catch (_) {}
}

const wrapCompartment = new Compartment();

// ---- DOM refs ----
const editorEl = document.getElementById('editor');
const outputEl = document.getElementById('output');
const runBtn = document.getElementById('run-btn');
const clearBtn = document.getElementById('clear-btn');
const toggleOutputBtn = document.getElementById('toggle-output-btn');
const outputSection = document.getElementById('output-section');
const vimModeEl = document.getElementById('vim-mode');
const cursorPosEl = document.getElementById('cursor-pos');
const channelSelect = document.getElementById('channel-select');
const modeSelect = document.getElementById('mode-select');
const editionSelect = document.getElementById('edition-select');
const helpBtn = document.getElementById('help-btn');
const cheatsheetOverlay = document.getElementById('cheatsheet-overlay');
const cheatsheetBackdrop = document.getElementById('cheatsheet-backdrop');
const cheatsheetClose = document.getElementById('cheatsheet-close');

// ---- Cheatsheet toggle ----
function toggleCheatsheet() {
  cheatsheetOverlay.classList.toggle('cheatsheet-hidden');
}

function closeCheatsheet() {
  cheatsheetOverlay.classList.add('cheatsheet-hidden');
  view?.focus();
}

// ---- Running state ----
let isRunning = false;
let isFormatting = false;

// ---- Format code via Playground API ----
async function formatCode({ silent = false } = {}) {
  if (isFormatting) return false;
  isFormatting = true;

  if (!silent) {
    outputEl.innerHTML = '<span class="spinner"></span><span class="output-loading">Formatting...</span>';
    outputSection.classList.remove('collapsed');
  }

  const code = view.state.doc.toString();

  try {
    const resp = await fetch('https://play.rust-lang.org/format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: channelSelect.value,
        edition: editionSelect.value,
        code,
      }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

    const data = await resp.json();

    if (data.success && data.code && data.code !== code) {
      // Replace editor contents, preserving undo history
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: data.code },
      });
      saveCode(data.code);
      if (!silent) {
        outputEl.innerHTML = '<span class="output-success">✓ Formatted</span>';
      }
    } else if (data.success) {
      if (!silent) {
        outputEl.innerHTML = '<span class="output-success">✓ Already formatted</span>';
      }
    } else {
      if (!silent) {
        outputEl.innerHTML = '';
        const errSpan = document.createElement('span');
        errSpan.className = 'output-warning';
        errSpan.textContent = data.stderr || 'Format failed';
        outputEl.appendChild(errSpan);
      }
      return false;
    }
    return true;
  } catch (err) {
    if (!silent) {
      outputEl.innerHTML = '';
      const errSpan = document.createElement('span');
      errSpan.className = 'output-error';
      errSpan.textContent = `⚠ Format error: ${err.message}`;
      outputEl.appendChild(errSpan);
    }
    return false;
  } finally {
    isFormatting = false;
  }
}

// ---- Format then run ----
async function formatAndRun() {
  await formatCode({ silent: true });
  await runCode();
}

// ---- Run code ----
async function runCode() {
  if (isRunning) return;
  isRunning = true;
  runBtn.classList.add('running');

  // Show loading state
  outputEl.innerHTML = '<span class="spinner"></span><span class="output-loading">Compiling and running...</span>';

  // Ensure output is visible
  outputSection.classList.remove('collapsed');

  const code = view.state.doc.toString();
  saveCode(code);

  const payload = {
    channel: channelSelect.value,
    mode: modeSelect.value,
    edition: editionSelect.value,
    crateType: 'bin',
    tests: false,
    backtrace: false,
    code,
  };

  try {
    const resp = await fetch('https://play.rust-lang.org/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    const data = await resp.json();
    renderOutput(data);
  } catch (err) {
    outputEl.innerHTML = '';
    const errSpan = document.createElement('span');
    errSpan.className = 'output-error';
    errSpan.textContent = `⚠ Network error: ${err.message}\n\nThis may be a CORS issue. The Rust Playground API may not allow requests from this origin.\nTry running this app from localhost or the deployed GitHub Pages URL.`;
    outputEl.appendChild(errSpan);
  } finally {
    isRunning = false;
    runBtn.classList.remove('running');
  }
}

function renderOutput(data) {
  outputEl.innerHTML = '';

  const { success, stdout, stderr } = data;

  if (stderr && stderr.trim()) {
    const stderrEl = document.createElement('span');
    // Distinguish warnings from errors
    const hasError = /^error/m.test(stderr);
    stderrEl.className = hasError ? 'output-stderr' : 'output-warning';
    stderrEl.textContent = stderr;
    outputEl.appendChild(stderrEl);
  }

  if (stdout && stdout.trim()) {
    if (stderr && stderr.trim()) {
      outputEl.appendChild(document.createTextNode('\n'));
    }
    const stdoutEl = document.createElement('span');
    stdoutEl.className = 'output-stdout';
    stdoutEl.textContent = stdout;
    outputEl.appendChild(stdoutEl);
  }

  if ((!stdout || !stdout.trim()) && (!stderr || !stderr.trim())) {
    const emptyEl = document.createElement('span');
    emptyEl.className = 'output-placeholder';
    emptyEl.textContent = success
      ? '(program produced no output)'
      : '(compilation failed with no output)';
    outputEl.appendChild(emptyEl);
  }

  // Add exit status indicator
  if (success !== undefined) {
    const statusEl = document.createElement('span');
    statusEl.className = success ? 'output-success' : 'output-error';
    statusEl.textContent = success ? '\n\n✓ exit code: 0' : '\n\n✗ non-zero exit code';
    outputEl.appendChild(statusEl);
  }
}

// ---- Vim mode display ----
function updateVimMode(cm) {
  if (!cm) return;
  const mode = cm.state.vim?.mode || 'normal';
  const subMode = cm.state.vim?.visualMode ? 'visual' :
                  cm.state.vim?.insertMode ? 'insert' :
                  cm.state.vim?.replaceMode ? 'replace' : null;

  const displayMode = subMode || mode;
  const label = displayMode.toUpperCase();

  vimModeEl.textContent = label;
  vimModeEl.className = `mode-${displayMode.toLowerCase()}`;
}

// ---- Cursor position ----
function updateCursorPos(state) {
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const col = pos - line.from;
  cursorPosEl.textContent = `Ln ${line.number}, Col ${col + 1}`;
}

// ---- Build editor ----
const runKeymap = keymap.of([
  {
    key: 'Ctrl-Enter',
    run: () => {
      runCode();
      return true;
    },
  },
]);

const updateListener = EditorView.updateListener.of((update) => {
  if (update.selectionSet || update.docChanged) {
    updateCursorPos(update.state);
  }

  // Update vim mode on every update
  try {
    const cm = getCM(view);
    if (cm) updateVimMode(cm);
  } catch (_) {}

  // Debounced save
  if (update.docChanged) {
    clearTimeout(updateListener._saveTimer);
    updateListener._saveTimer = setTimeout(() => {
      saveCode(update.state.doc.toString());
    }, 1000);
  }
});

const view = new EditorView({
  state: EditorState.create({
    doc: getInitialCode(),
    extensions: [
      vim(),
      runKeymap,
      relativeLineNumbers,
      wrapCompartment.of(getInitialWrap() ? EditorView.lineWrapping : []),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      closeBrackets(),
      bracketMatching(),
      rainbowBrackets,
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
      rust(),
      oneDark,
      updateListener,
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-matchingBracket': {
          backgroundColor: 'rgba(209, 154, 102, 0.15)',
          fontWeight: '700',
          outline: '1px solid rgba(209, 154, 102, 0.4)',
          borderRadius: '2px',
        },
        '.cm-nonmatchingBracket': {
          color: '#e06c75 !important',
          backgroundColor: 'rgba(224, 108, 117, 0.15)',
          fontWeight: '700',
        },
      }),
    ],
  }),
  parent: editorEl,
});

// ---- Wire :w to run code ----
// Define a custom Vim ex-command :w that runs the code
try {
  Vim.defineEx('w', 'w', () => {
    formatAndRun();
  });
  Vim.defineEx('write', 'w', () => {
    formatAndRun();
  });
  Vim.defineEx('run', 'run', () => {
    runCode();
  });
  Vim.defineEx('fmt', 'fmt', () => {
    formatCode();
  });
  Vim.defineEx('format', 'fmt', () => {
    formatCode();
  });
  Vim.defineEx('help', 'help', () => {
    toggleCheatsheet();
  });

  // Space is "move right" by default; unmap it so <Space>uw can be a leader sequence.
  Vim.unmap('<Space>');
  Vim.map('<Space>', 'l', 'visual');
  Vim.map('<Space>', 'l', 'operatorPending');
  Vim.defineAction('toggleWrap', (cm) => {
    const v = cm.cm6;
    const next = !v.lineWrapping;
    v.dispatch({
      effects: wrapCompartment.reconfigure(next ? EditorView.lineWrapping : []),
    });
    saveWrap(next);
  });
  Vim.mapCommand('<Space>uw', 'action', 'toggleWrap', {}, { context: 'normal' });
} catch (e) {
  console.warn('Could not define Vim ex commands:', e);
}

// ---- Event listeners ----
runBtn.addEventListener('click', runCode);

clearBtn.addEventListener('click', () => {
  outputEl.innerHTML = '<span class="output-placeholder">Output cleared.</span>';
});

toggleOutputBtn.addEventListener('click', () => {
  outputSection.classList.toggle('collapsed');
});

helpBtn.addEventListener('click', toggleCheatsheet);
cheatsheetClose.addEventListener('click', closeCheatsheet);
cheatsheetBackdrop.addEventListener('click', closeCheatsheet);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !cheatsheetOverlay.classList.contains('cheatsheet-hidden')) {
    e.preventDefault();
    e.stopPropagation();
    closeCheatsheet();
  }
});

// ---- Vim mode polling (fallback for mode changes) ----
setInterval(() => {
  try {
    const cm = getCM(view);
    if (cm) updateVimMode(cm);
  } catch (_) {}
}, 200);

// ---- Initial state ----
updateCursorPos(view.state);

// Focus editor on load
view.focus();
