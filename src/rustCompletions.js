import { ifNotIn, snippetCompletion } from '@codemirror/autocomplete';

const IGNORE = ['LineComment', 'BlockComment', 'String', 'RawString', 'Char'];

const KEYWORDS = [
  'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else',
  'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop',
  'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self',
  'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use',
  'where', 'while', 'union',
].map((label) => ({ label, type: 'keyword' }));

const TYPES = [
  'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
  'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
  'f32', 'f64', 'bool', 'char', 'str', 'String',
  'Vec', 'Option', 'Result', 'Box', 'Rc', 'Arc',
  'Cell', 'RefCell', 'HashMap', 'HashSet',
  'BTreeMap', 'BTreeSet', 'Cow', 'Path', 'PathBuf',
  'Iterator', 'IntoIterator', 'From', 'Into', 'Default',
  'Debug', 'Clone', 'Copy', 'Drop', 'Eq', 'PartialEq',
  'Ord', 'PartialOrd', 'Hash', 'Display', 'Error',
].map((label) => ({ label, type: 'type' }));

const CONSTANTS = [
  { label: 'Some', type: 'constant', detail: 'Option' },
  { label: 'None', type: 'constant', detail: 'Option' },
  { label: 'Ok', type: 'constant', detail: 'Result' },
  { label: 'Err', type: 'constant', detail: 'Result' },
];

const METHODS = [
  'iter', 'iter_mut', 'into_iter', 'map', 'filter', 'filter_map', 'flat_map',
  'flatten', 'fold', 'reduce', 'collect', 'cloned', 'copied', 'enumerate',
  'zip', 'chain', 'skip', 'take', 'find', 'any', 'all', 'count', 'sum',
  'for_each', 'unwrap', 'expect', 'unwrap_or', 'unwrap_or_else',
  'unwrap_or_default', 'ok_or', 'ok_or_else', 'and_then', 'or_else',
  'is_some', 'is_none', 'is_ok', 'is_err', 'as_ref', 'as_mut',
  'clone', 'to_string', 'to_owned', 'into', 'len', 'is_empty', 'push', 'pop',
  'insert', 'remove', 'get', 'get_mut', 'contains', 'contains_key', 'clear',
  'extend', 'retain', 'sort', 'sort_by', 'first', 'last', 'split_at',
  'as_str', 'as_bytes', 'to_vec', 'chars', 'bytes', 'lines', 'trim', 'split',
  'parse', 'lock', 'read', 'write', 'spawn',
].map((label) => ({ label, type: 'method' }));

const ATTRIBUTES = [
  'derive', 'allow', 'warn', 'deny', 'forbid', 'cfg', 'cfg_attr', 'test',
  'inline', 'must_use', 'deprecated', 'path', 'macro_use', 'macro_export',
  'repr', 'no_mangle', 'allow(dead_code)', 'allow(unused)',
].map((label) => ({ label, type: 'keyword', detail: 'attribute' }));

const SNIPPETS = [
  snippetCompletion('fn ${name}(${args}) {\n\t${}\n}', {
    label: 'fn', type: 'keyword', detail: 'snippet', boost: 3,
  }),
  snippetCompletion('pub fn ${name}(${args}) {\n\t${}\n}', {
    label: 'pub fn', type: 'keyword', detail: 'snippet', boost: 2,
  }),
  snippetCompletion('fn main() {\n\t${}\n}', {
    label: 'fn main', type: 'keyword', detail: 'snippet', boost: 4,
  }),
  snippetCompletion('impl ${Type} {\n\t${}\n}', {
    label: 'impl', type: 'keyword', detail: 'snippet', boost: 3,
  }),
  snippetCompletion('impl ${Trait} for ${Type} {\n\t${}\n}', {
    label: 'impl for', type: 'keyword', detail: 'snippet', boost: 2,
  }),
  snippetCompletion('struct ${Name} {\n\t${}\n}', {
    label: 'struct', type: 'keyword', detail: 'snippet', boost: 3,
  }),
  snippetCompletion('enum ${Name} {\n\t${}\n}', {
    label: 'enum', type: 'keyword', detail: 'snippet', boost: 3,
  }),
  snippetCompletion('trait ${Name} {\n\t${}\n}', {
    label: 'trait', type: 'keyword', detail: 'snippet', boost: 3,
  }),
  snippetCompletion('mod ${name} {\n\t${}\n}', {
    label: 'mod', type: 'keyword', detail: 'snippet', boost: 2,
  }),
  snippetCompletion('match ${expr} {\n\t${} => ${},\n}', {
    label: 'match', type: 'keyword', detail: 'snippet', boost: 3,
  }),
  snippetCompletion('if let ${pat} = ${expr} {\n\t${}\n}', {
    label: 'if let', type: 'keyword', detail: 'snippet', boost: 2,
  }),
  snippetCompletion('while let ${pat} = ${expr} {\n\t${}\n}', {
    label: 'while let', type: 'keyword', detail: 'snippet', boost: 2,
  }),
  snippetCompletion('for ${item} in ${iter} {\n\t${}\n}', {
    label: 'for', type: 'keyword', detail: 'snippet', boost: 2,
  }),
  snippetCompletion('loop {\n\t${}\n}', {
    label: 'loop', type: 'keyword', detail: 'snippet', boost: 2,
  }),
  snippetCompletion('#[derive(${Debug, Clone})]\n', {
    label: 'derive', type: 'keyword', detail: 'snippet', boost: 2,
  }),
  snippetCompletion('println!("${}");', {
    label: 'println!', type: 'function', detail: 'macro', boost: 4,
  }),
  snippetCompletion('eprintln!("${}");', {
    label: 'eprintln!', type: 'function', detail: 'macro',
  }),
  snippetCompletion('format!("${}")', {
    label: 'format!', type: 'function', detail: 'macro',
  }),
  snippetCompletion('dbg!(${})', {
    label: 'dbg!', type: 'function', detail: 'macro',
  }),
  snippetCompletion('vec![${}]', {
    label: 'vec!', type: 'function', detail: 'macro', boost: 3,
  }),
  snippetCompletion('panic!("${}");', {
    label: 'panic!', type: 'function', detail: 'macro',
  }),
  snippetCompletion('todo!()', {
    label: 'todo!', type: 'function', detail: 'macro',
  }),
  snippetCompletion('unimplemented!()', {
    label: 'unimplemented!', type: 'function', detail: 'macro',
  }),
  snippetCompletion('assert_eq!(${left}, ${right});', {
    label: 'assert_eq!', type: 'function', detail: 'macro',
  }),
  snippetCompletion('assert!(${});', {
    label: 'assert!', type: 'function', detail: 'macro',
  }),
];

const IDENT_OPTIONS = [...SNIPPETS, ...KEYWORDS, ...TYPES, ...CONSTANTS];

function rustCompletionSource(context) {
  const attr = context.matchBefore(/#\[?\w*/);
  if (attr && attr.text.startsWith('#')) {
    const from = attr.text.startsWith('#[') ? attr.from + 2 : attr.from + 1;
    return {
      from: Math.min(from, context.pos),
      options: ATTRIBUTES,
      validFor: /^\w*$/,
    };
  }

  const dotted = context.matchBefore(/\.\w*/);
  if (dotted) {
    return {
      from: dotted.from + 1,
      options: METHODS,
      validFor: /^\w*$/,
    };
  }

  const word = context.matchBefore(/[A-Za-z_][\w!]*/);
  if (!word && !context.explicit) return null;
  if (word && word.from === word.to && !context.explicit) return null;

  return {
    from: word ? word.from : context.pos,
    options: IDENT_OPTIONS,
    validFor: /^[\w!]*$/,
  };
}

export const rustCompletions = ifNotIn(IGNORE, rustCompletionSource);
