import test from 'ava';
import _ from 'underscore';
import { promises } from 'fs';

const fsPromises = promises;
// ------------------- Glossary -------------------
/*
 * Standard test project -> wiki_builder_test
 * Plugin test project ---> wiki_builder_test_plugin
 * Test plugin -----------> wiki-builder-plugin-test
 */

// -------------------- About ---------------------
/*
 * - The test plugin writes to a log file to make
 *   it easily testable.
 * - The standard test project tests wiki-builder.
 * - The plugin test project tests wiki-builder
 *   and its ability to work with plugins.
 * - The plugin test project's wiki files and
 *   the standard test project's wiki files
 *   should be the same.
 */

// -------------------- Paths ---------------------

const standardTestProjectPath = 'test/wiki_builder_test/';
const pluginTestProjectPath = 'test/wiki_builder_test_plugin/';
const pluginTestLogPath = `${pluginTestProjectPath}/log.txt`;
const wikiDir = 'wiki/';

// --------------- Expected Results ---------------

const wikiFiles = new Map();
wikiFiles.set('Hello.md', {
  title: 'Hello',
  'ignore-content': false,
  content: '# Hello\n'
    + '\n'
    + 'First part of hello world',
});
wikiFiles.set('Overview.md', {
  title: 'Overview',
  'ignore-content': false,
  content: '# Overview\n'
    + '\n'
    + 'Test file',
});
wikiFiles.set('Source-Code.md', {
  title: 'Source Code',
  'ignore-content': false,
  content: '# Source Code\n'
    + '\n'
    + 'Some text here',
});
wikiFiles.set('Stats.md', {
  title: 'Stats',
  'ignore-content': true,
  content: '',
});
wikiFiles.set('Test.md', {
  title: 'test',
  'ignore-content': false,
  content: '# test\n'
    + '\n'
    + 'Overview text here',
});
wikiFiles.set('World.md', {
  title: 'World',
  'ignore-content': false,
  content: '# World\n'
    + '\n'
    + 'Second part of hello world',
});

const wikiFileNames = [ ...wikiFiles.keys() ];

const testPluginResults = 'testMethodByTest was called\n'
  + 'testMethodByTest was called\n'
  + 'filesByTestReduce was called\n'
  + 'testMethodByTest was called\n'
  + 'filesByTestReduce was called\n'
  + 'testMethodByTest was called\n'
  + 'filesByTestReduce was called\n'
  + 'testMethodByTest was called\n'
  + 'filesByTestReduce was called\n'
  + 'testMethodTwo was called\n'
  + 'filesByTestReduce was called\n'
  + 'testMethodByTest was called\n'
  + 'filesByTestReduce was called\n';

// -------------- Helper Functions ---------------

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index += 1) {
    await callback(array[index], index, array);
  }
}

// -------------------- Tests ---------------------

test('Tests have access to standard tests project', async (t) => {
  let res;
  try {
    res = await fsPromises.readdir(standardTestProjectPath);
  } catch (err) {
    console.log('catch error', err);
    t.fail();
  }
  if (res === undefined) {
    console.log('res undefined');
    t.fail();
  }
  if (res.length > 0) {
    t.pass();
  } else {
    t.fail();
  }
});

test('Tests have access to plugin tests project', async (t) => {
  let res;
  try {
    res = await fsPromises.readdir(pluginTestProjectPath);
  } catch (err) {
    console.log('catch error', err);
    t.fail();
  }
  if (res === undefined) {
    console.log('res undefined');
    t.fail();
  }
  if (res.length > 0) {
    t.pass();
  } else {
    t.fail();
  }
});

test('Standard test project added files to wiki directory as expected', async (t) => {

  let res;
  try {
    res = await fsPromises.readdir(standardTestProjectPath + wikiDir);
  } catch (err) {
    console.log('catch error', err);
    t.fail();
  }
  if (res === undefined) {
    console.log('res undefined');
    t.fail();
  }

  res.filter(fileName => /\.md$/.test(fileName));

  if (_.isEqual(res.sort(), wikiFileNames.sort())) {
    t.pass();
  } else {
    t.fail();
  }
});

test('Plugin test project added files to wiki directory as expected', async (t) => {
  let res;
  try {
    res = await fsPromises.readdir(pluginTestProjectPath + wikiDir);
  } catch (err) {
    console.log('catch error', err);
    t.fail();
  }
  if (res === undefined) {
    console.log('res undefined');
    t.fail();
  }

  res.filter(fileName => /\.md$/.test(fileName));

  if (_.isEqual(res.sort(), wikiFileNames.sort())) {
    t.pass();
  } else {
    t.fail();
  }
});

test('Standard test project created titles in wiki markdown files as expected', async (t) => {
  let res;
  try {
    res = await fsPromises.readdir(standardTestProjectPath + wikiDir);
  } catch (err) {
    console.log('catch error', err);
    t.fail();
  }
  if (res === undefined) {
    console.log('res undefined');
    t.fail();
  }

  const start = async () => {
    await asyncForEach(res, async (file) => {
      let fileRes;
      try {
        fileRes = await fsPromises.readFile(standardTestProjectPath + wikiDir + file, 'utf8');
      } catch (err) {
        console.log('catch error', err);
        t.fail();
      }
      if (fileRes === undefined) {
        console.log('fileRes undefined');
        t.fail();
      }
      if (fileRes.split('\n')[0] !== `# ${wikiFiles.get(file).title}`) {
        t.fail();
      }
    });
    t.pass();
  };
  await start();
});

test('Plugin test project created titles in wiki markdown files as expected', async (t) => {
  let res;
  try {
    res = await fsPromises.readdir(pluginTestProjectPath + wikiDir);
  } catch (err) {
    console.log('catch error', err);
    t.fail();
  }
  if (res === undefined) {
    console.log('res undefined');
    t.fail();
  }

  const start = async () => {
    await asyncForEach(res, async (file) => {
      let fileRes;
      try {
        fileRes = await fsPromises.readFile(pluginTestProjectPath + wikiDir + file, 'utf8');
      } catch (err) {
        console.log('catch error', err);
        t.fail();
      }
      if (fileRes === undefined) {
        console.log('fileRes undefined');
        t.fail();
      }
      if (fileRes.split('\n')[0] !== `# ${wikiFiles.get(file).title}`) {
        t.fail();
      }
    });
    t.pass();
  };
  await start();
});

test('Standard test project created wiki markdown files as expected', async (t) => {
  let res;
  try {
    res = await fsPromises.readdir(standardTestProjectPath + wikiDir);
  } catch (err) {
    console.log('catch error', err);
    t.fail();
  }
  if (res === undefined) {
    console.log('res undefined');
    t.fail();
  }

  const start = async () => {
    await asyncForEach(res, async (file) => {
      let fileRes;
      try {
        fileRes = await fsPromises.readFile(standardTestProjectPath + wikiDir + file, 'utf8');
      } catch (err) {
        console.log('catch error', err);
        t.fail();
      }
      if (fileRes === undefined) {
        console.log('fileRes undefined');
        t.fail();
      }

      if (file !== 'Stats.md' && fileRes !== wikiFiles.get(file).content) {
        t.fail();
      }
    });
    t.pass();
  };
  await start();
});

test('Plugin test project created wiki markdown files as expected', async (t) => {
  let res;
  try {
    res = await fsPromises.readdir(pluginTestProjectPath + wikiDir);
  } catch (err) {
    console.log('catch error', err);
    t.fail();
  }
  if (res === undefined) {
    console.log('res undefined');
    t.fail();
  }

  const start = async () => {
    await asyncForEach(res, async (file) => {
      let fileRes;
      try {
        fileRes = await fsPromises.readFile(pluginTestProjectPath + wikiDir + file, 'utf8');
      } catch (err) {
        console.log('catch error', err);
        t.fail();
      }
      if (fileRes === undefined) {
        console.log('fileRes undefined');
        t.fail();
      }

      if (file !== 'Stats.md' && fileRes !== wikiFiles.get(file).content) {
        t.fail();
      }
    });
    t.pass();
  };
  await start();
});

test('Test plugin works as expected', async (t) => {
  let res;
  try {
    res = await fsPromises.readFile(pluginTestLogPath, 'utf8');
  } catch (err) {
    console.log('catch error', err);
    t.fail();
  }
  if (res === undefined) {
    console.log('res undefined');
    t.fail();
  }
  t.deepEqual(res.split('\n').sort(), testPluginResults.split('\n').sort());
});
