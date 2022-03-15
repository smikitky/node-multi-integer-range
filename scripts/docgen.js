const path = require('path');
const fs = require('fs/promises');

// Yes I do know the ideal is to use a serious parser, but this works

const parseDocComment = docComment => {
  const lines = docComment
    .split('\n')
    .map(s => s.replace(/^\s*(\/\*\*|\*)?\s*/g, ''));
  const tags = {};
  let currentTag = 'summary';
  let currentTagContent = '';
  const push = (tagName, content) => {
    if (!(tagName in tags)) tags[tagName] = [];
    tags[tagName].push(
      content
        .replace('\\{', '{')
        .replace('\\}', '}')
        .replace(
          /`(.+?)\(\)`/g,
          (...m) => `[\`${m[1]}()\`](#function-${m[1].toLowerCase()})`
        )
        .trim()
    );
  };
  for (const line of lines) {
    const match = line.trim().match(/^@([a-zA-Z]+)\s*(.*)/);
    if (!match) {
      currentTagContent += (currentTagContent.length ? '\n' : '') + line;
    } else {
      push(currentTag, currentTagContent);
      currentTag = match[1];
      currentTagContent = match[2];
    }
  }
  push(currentTag, currentTagContent);
  return tags;
};

const parseScript = content => {
  return Array.from(content.matchAll(/\/\*\*(.+?)\*\/\n(.+?);\n/gs))
    .filter(match => {
      return /^export (const|type)/.test(match[2]);
    })
    .map(([, doc, identifier]) => {
      if (identifier.match(/export const/)) {
        const match = identifier.match(/export const (.+?) = (.+?) =>/s);
        return {
          type: 'function',
          name: match[1],
          doc: parseDocComment(doc),
          signature: match[2].replaceAll('MIR', 'MultiIntegerRange')
        };
      } else {
        const match = identifier.match(/export type (.+?) = (.+)/s);
        return {
          type: 'type',
          name: match[1],
          doc: parseDocComment(doc),
          content: match[2]
        };
      }
    })
    .filter(item => !item.doc.private);
};

const buildMarkdown = parsed => {
  const lines = [
    '# multi-integer-range API Reference',
    '',
    '- All functions are *pure* functions. They do not alter the input arguments nor do they have side effects.',
    '- All functions and types are exported as named exports.',
    '- All MultiIntegerRange returned by these functions are normalized.',
    '',
    '## Contents',
    ''
  ];

  parsed
    .filter(item => item.type === 'function')
    .forEach(item => {
      lines.push(
        `- [\`${item.name}()\`](#function-${item.name.toLowerCase()})`
      );
    });
  lines.push('');

  parsed.forEach(item => {
    lines.push('---', '', `## ${item.type}: \`${item.name}\``, '');
    if (item.type === 'function') {
      lines.push('```ts', `${item.name}${item.signature}`, '```', '');
    } else {
      lines.push('```ts', `type ${item.name} = ${item.content};`, '```', '');
    }
    if (item.doc.param) {
      lines.push('| Param | Description |', '|-|-|');
      item.doc.param.forEach(param => {
        const [p, d] = param.split(' - ', 2);
        lines.push(`| \`${p}\` | ${d} |`);
      });
      if (item.doc.returns) {
        lines.push(
          `| Returns | ${item.doc.returns[0].replaceAll('\n', ' ')} |`
        );
      }
      lines.push('');
    }
    lines.push(item.doc.summary, '');
    if (item.doc.example) {
      lines.push('### Example', '', '```ts', item.doc.example, '```', '');
    }
  });
  return lines.join('\n');
};

const main = async () => {
  const script = await fs.readFile(
    path.join(__dirname, '../src/fp.ts'),
    'utf8'
  );
  const parsed = parseScript(script);
  const markdown = buildMarkdown(parsed);
  await fs.writeFile(
    path.join(__dirname, '../api-reference.md'),
    markdown,
    'utf8'
  );
};

main();
