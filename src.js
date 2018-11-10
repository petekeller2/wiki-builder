// @flow
import fs from 'fs-extra';
import glob from 'glob';
import shell from 'shelljs';

type wikiConfigType = {
  wikiDirPath: string,
  projectDirPath: string,
  ignoreMdFiles: string[],
  ignoreMdTitles: string[],
  ignoreDirs: string[],
  statsEnabled: any,
  useGitignore: any,
};
type bufferAndPath = {
  buffer: Promise<Buffer>,
  filePath: string
};
type strOrBool = string | boolean;
type reducePromiseArray = Promise<Array<any>>;
type raSteps = Map<[(any) => any, any[]], (any) => any>;
type rdaEnd = Promise<Error | void>;

export default {
  tempWikiDir: 'tempMdFiles',
  wikiConfigFileName: 'wikiConfig.json',
  safetyCounterLimit: 100,
  async buildWiki() {
    const wikiConfig = await this.getWikiConfigData(await this.findWikiConfigPath());
    const {
      wikiDirPath, ignoreMdTitles, statsEnabled, plugins,
    } = wikiConfig;

    await fs.ensureDir(wikiDirPath);
    await this.removeMdFilesInWikiDir(wikiDirPath);
    await this.emptyTempWikiDir(wikiDirPath);
    await this.copyFilesToTempDir(wikiConfig);
    await this.createStatsIfEnabled(statsEnabled, wikiDirPath);

    let reduceActionSteps = new Map();
    reduceActionSteps.set([this.configIgnoreByTitle, [ignoreMdTitles]], [this.removeFiles, []]);
    reduceActionSteps = this.addPluginReduceActionSteps(reduceActionSteps, plugins);
    reduceActionSteps.set([this.wikiFileNameByTitle, []], [this.moveFilesToWiki, [this]]);
    await this.readReduceAction(reduceActionSteps, wikiDirPath);

    await this.removeTempDir(wikiDirPath);
  },

  addPluginReduceActionSteps(reduceActionSteps: raSteps, plugins: any): raSteps {
    if (!Array.isArray(plugins) || plugins.length <= 0) {
      return reduceActionSteps;
    }
    plugins.forEach((plugin) => {
      console.log(plugin); // debug
      // eslint-disable-next-line
      const tempPlugin = require(plugin);
      // const raStep = tempPlugin();
      // $FlowFixMe
      // reduceActionSteps.set(raStep);
    });
    return reduceActionSteps;
  },

  async findWikiConfigPath(): Promise<string> {
    if (await fs.pathExists(`./${this.wikiConfigFileName}`)) {
      return this.wikiConfigFileName;
    }
    const regex = new RegExp(`${this.wikiConfigFileName}$`, 'g');
    return shell.find('.').filter(file => file.match(regex)).pop();
  },
  getWikiConfigData(wikiStringPath: string): wikiConfigType {
    return fs.readJson(wikiStringPath)
      .then(wikiConfig => this.useGitignoredIfEnabled(this.cleanWikiConfigData(wikiConfig)))
      .catch((err) => {
        console.error(err);
        return {};
      });
  },
  cleanWikiConfigData(wikiConfig: wikiConfigType): wikiConfigType {
    const cleanedWikiConfig = {};

    cleanedWikiConfig.wikiDirPath = this.cleanWikiConfigPath(wikiConfig.wikiDirPath, './wiki/');
    cleanedWikiConfig.projectDirPath = this.cleanWikiConfigPath(wikiConfig.projectDirPath, './');
    cleanedWikiConfig.ignoreMdFiles = this.cleanWikiConfigArray(wikiConfig.ignoreMdFiles, 'lower');
    cleanedWikiConfig.ignoreDirs = this.cleanWikiConfigArray(wikiConfig.ignoreDirs, 'lower');
    cleanedWikiConfig.ignoreDirs.push('node_modules');
    cleanedWikiConfig.ignoreMdTitles = this.cleanWikiConfigArray(wikiConfig.ignoreMdTitles, 'lower');
    cleanedWikiConfig.statsEnabled = this.cleanWikiConfigBool(wikiConfig.statsEnabled);
    cleanedWikiConfig.useGitignore = this.cleanWikiConfigBool(wikiConfig.useGitignore, true);

    return cleanedWikiConfig;
  },
  cleanWikiConfigPath(configPath: string, defaultPath: string): string {
    let configPathReturn = configPath.trim();
    if (configPathReturn.length === 0) {
      configPathReturn = defaultPath;
    } else if (configPathReturn.slice(-1) !== '/') {
      configPathReturn += '/';
    }
    return configPathReturn;
  },
  cleanWikiConfigArray(configArray: string[], caseFunc: string): string[] {
    let configArrayReturn = configArray;
    if (!Array.isArray(configArray) && configArray) {
      if (typeof (configArray) !== typeof (true)) {
        configArrayReturn = [];
        configArrayReturn.push(String(configArray));
      }
    }
    return configArrayReturn
      .map((file) => {
        let fileReturn = String(file).trim();
        if (caseFunc.toLowerCase() === 'lower') {
          fileReturn = fileReturn.toLowerCase();
        } else if (caseFunc.toLowerCase() === 'upper') {
          fileReturn = fileReturn.toUpperCase();
        }
        return fileReturn;
      })
      .filter(file => file.length > 0);
  },
  cleanWikiConfigBool(configBool: any, defaultValue: boolean): boolean {
    if (typeof configBool === 'string') {
      const firstChar = configBool.toLowerCase().trim().charAt(0);
      return Boolean(firstChar === 't' || firstChar === 'y');
    }
    if (defaultValue && configBool === undefined) {
      return defaultValue;
    }
    return Boolean(configBool);
  },
  async emptyTempWikiDir(wikiDirPath: string): Promise<void | Error> {
    const wikiTempDir = `${wikiDirPath}${this.tempWikiDir}`;
    const pathExists = await fs.pathExists(wikiTempDir);
    if (pathExists) {
      return fs.emptyDir(wikiTempDir);
    }
    return fs.ensureDir(wikiTempDir);
  },
  getMdFilesInDir(dirPath: string, dirType: string): Promise<[] | Error> {
    return new Promise((resolve, reject) => {
      glob(`${dirPath}${dirType.toLowerCase() === 'project' ? '{/**/,/}' : '/'}*.md`, (er, files) => {
        if (er) {
          reject(er);
        } else {
          resolve(files);
        }
      });
    });
  },
  async removeMdFilesInWikiDir(wikiDirPath: string): Promise<Array<void | Error>> {
    const mdFiles = await this.getMdFilesInDir(wikiDirPath, 'wiki');
    const removeMdFilePromises = mdFiles.map(file => fs.remove(file));
    return Promise.all(removeMdFilePromises);
  },
  async copyFilesToTempDir(wikiConfig: wikiConfigType): Promise<Array<void | string | Error>> {
    const { wikiDirPath, projectDirPath, ignoreMdFiles } = wikiConfig;
    let mdFiles = await this.getMdFilesInDir(projectDirPath, 'project');
    mdFiles = mdFiles.filter(this.ignoreDirsFilterCallback(wikiConfig.ignoreDirs));
    let i = 0;
    const copyMdFilePromises = mdFiles.map((file) => {
      const splitFile = file.split('/');
      const fileName = splitFile.pop();
      const fileNameNoFileType = fileName.split('.').shift();
      const fileNamesToIgnore = [file, fileName, fileNameNoFileType];
      i += 1;
      const ignoreMdSpecificFiles = ignoreMdFiles.filter(f => f.includes('/'));
      const ignoreMdFileNames = ignoreMdFiles.filter(f => !f.includes('/'));
      if ((!ignoreMdSpecificFiles.some(ignore => file === ignore)) &&
        (!ignoreMdFileNames.some(ignore => fileNamesToIgnore.includes(ignore)))) {
        return fs.copy(file, `${wikiDirPath}${this.tempWikiDir}/${i}.md`);
      }
      return '';
    });
    return Promise.all(copyMdFilePromises);
  },
  // A stats file will only be created for git repos with commits. Disabled by default
  async createStatsIfEnabled(statsEnabled: boolean, wikiDirPath: string): Promise<string> {
    if (!statsEnabled) {
      return 'Stats not enabled';
    }
    const statsFile = `${wikiDirPath}/${this.tempWikiDir}/Stats.md`;
    let command = 'git diff --stat `git hash-object -t tree /dev/null`';
    command = `${command} > ${statsFile}`;
    await new Promise(((resolve, reject) => {
      shell.exec(command, (code, stdout, stderr) => {
        if (stderr) {
          reject(stderr);
        }
        resolve(stdout);
      });
    }));
    const writeFileData = await new Promise(((resolve, reject) => {
      fs.readFile(statsFile, 'utf8', (err, data) => {
        if (err) reject(err);
        const newFileData = data.toString().split('\n');
        if (data.toString().length > 0) {
          newFileData.pop();
          const fileCountLineCount = newFileData.pop();
          const numberMatches = fileCountLineCount.match(/\d+/g);
          if (numberMatches[1].length > 0) {
            newFileData.push(`### Total Lines of Code: ${numberMatches[1]}`);
          }
          if (numberMatches[0].length > 0) {
            newFileData.splice(0, 0, `### Number of Files: ${numberMatches[0]}`);
          }
          newFileData.splice(0, 0, '# Stats');
        }
        resolve(newFileData.join('\n\n'));
      });
    }));
    if (writeFileData.length > 0) {
      return new Promise(((resolve, reject) => {
        fs.writeFile(statsFile, writeFileData, 'utf8', (err) => {
          if (err) reject(err);
          resolve('Stats file cleaned');
        });
      }));
    }
    await fs.remove(statsFile);
    return 'Stats file removed because it was empty';
  },
  // Updates the wikiConfig object. Enabled by default
  async useGitignoredIfEnabled(wikiConfig: wikiConfigType): Promise<wikiConfigType> {
    const gitIgnoreFound = await fs.pathExists(`${wikiConfig.projectDirPath}.gitignore`);
    if (wikiConfig.useGitignore && gitIgnoreFound) {
      const newWikiConfig = wikiConfig;
      const gitIgnoreFile = await fs.readFile(`${wikiConfig.projectDirPath}.gitignore`, 'utf8');
      const gitIgnoreArray = gitIgnoreFile.split('\n');
      gitIgnoreArray.forEach((line) => {
        const endOfPath = line.split('/').pop();
        if (line.slice(-1) === '/') {
          newWikiConfig.ignoreDirs.push(line);
        } else if (endOfPath.split('.').pop().toLowerCase() === 'md') {
          newWikiConfig.ignoreMdFiles.push(line);
        }
      });
      return newWikiConfig;
    }
    return wikiConfig;
  },
  ignoreDirsFilterCallback(ignoreDirs: string[]) {
    return (file: string): boolean => ignoreDirs
      .filter(ignoreDir => file.includes(ignoreDir)).length === 0;
  },
  //   Read: Reads md files in the temporary wiki directory.
  // Reduce: Passes read results, specific function and its extra arguments to a reduce function.
  // Action: Passes reduced results and extra action function arguments to an action function.
  // The name of the specific function determines which reduce function will be used.
  async readReduceAction(reduceActionSteps: raSteps, wikiDirPath: string, safety: number): rdaEnd {
    // ------------------------------- Safety Counter -------------------------------
    let safetyCounter = safety;
    if (!safetyCounter) {
      safetyCounter = 1;
    } else if (safetyCounter > this.safetyCounterLimit) {
      return new Error('readReduceAction went over safety counter');
    }
    safetyCounter += 1;
    // ------------- Get Functions and Extra Arguments for Next Section -------------
    const mapKeyValue = reduceActionSteps.entries().next().value;
    if (!mapKeyValue) {
      return new Error('No reduceActionSteps');
    }
    const [mapKey, mapValue] = mapKeyValue;
    const [specificFunc, extraSpecificArgs] = mapKey;
    const [actionOnReducedFunc, extraActionArgs] = mapValue;
    const reduceFuncName = this.findReduceFuncName(specificFunc);
    if (!reduceFuncName) {
      return new Error(`Reduce function for ${specificFunc.name} not found 
      (The pattern is ...By{x} for the specific function and ...By{x}Reduce for the reduce function).`);
    }
    // ----------------------------- Read Reduce Action -----------------------------
    const filesInTempDir = await this.readFilesInTempDir(wikiDirPath);
    const reduced = await this[reduceFuncName](filesInTempDir, extraSpecificArgs, specificFunc);
    await actionOnReducedFunc(reduced, ...extraActionArgs);
    // ------------------ Recursive Function Call or Termination --------------------
    if (reduceActionSteps.size !== 1) {
      reduceActionSteps.delete(mapKey);
      return this.readReduceAction(reduceActionSteps, wikiDirPath, safetyCounter);
    }
    return undefined;
  },
  // Reduce Function (for readReduceAction)
  findReduceFuncName(specificFunc: () => any): string | void {
    const matchResults = specificFunc.name.match(/By(.*)/);
    if (matchResults) {
      const reduceNameSearch = `By${matchResults[1]}`;
      return Object.keys(this).find((prop) => {
        if (prop && (typeof this[prop] === 'function') && this[prop].name) {
          return this[prop].name.endsWith(`${reduceNameSearch}Reduce`);
        }
        return false;
      });
    }
    return undefined;
  },
  getFilesInTempDir(wikiDirPath: string): Promise<Array<string | Error>> {
    return fs.readdir(`${wikiDirPath}${this.tempWikiDir}`);
  },
  async readFilesInTempDir(wikiDirPath: string): Promise<Array<Object | Error>> {
    const filesInTempDir = await this.getFilesInTempDir(wikiDirPath);
    const filePaths = filesInTempDir.map(file => `${wikiDirPath}${this.tempWikiDir}/${file}`);
    const fileAndBuffer = filePaths.map(file => ({
      filePath: file,
      buffer: fs.readFile(file),
    }));
    return Promise.all(fileAndBuffer);
  },
  filesByTitleReduce(filesInTempDir: Object[], extraArgs: any[], specificFunc: (
    lines: string[], fileObj: bufferAndPath, any[]) =>
    any): Promise<any[]> {
    return filesInTempDir.reduce(async (accumulator: reducePromiseArray, fileObj: {
      buffer: Promise<Buffer>, filePath: string
    }): reducePromiseArray => {
      const awaitedAccumulator = await accumulator;
      const buffer = await fileObj.buffer;
      let lines = buffer.toString('utf-8').split('\n');
      lines = lines
        .map(line => line.replace(/#/, '').trim().toLowerCase())
        .filter(line => line.length > 0);
      const file = specificFunc(lines, fileObj, ...extraArgs);
      if (file !== false) {
        awaitedAccumulator.push(file);
      }
      return awaitedAccumulator;
    }, Promise.resolve([]));
  },
  // Specific Function (for readReduceAction)
  configIgnoreByTitle(lines: string[], fileObj: bufferAndPath, ignoreTitles: string[]): strOrBool {
    if (ignoreTitles.includes(lines.shift())) {
      return fileObj.filePath;
    }
    return false;
  },
  // Specific Function (for readReduceAction)
  // returns { file path: wiki file name }
  wikiFileNameByTitle(lines: string[], fileObj: bufferAndPath): {} {
    const returnObj = {};
    const wikiTitle = lines.shift();
    let wikiFileName = wikiTitle.replace(/\b\w/g, word => word.toUpperCase());
    wikiFileName = wikiFileName.replace(/\s+/g, '-');
    if (fileObj.filePath) {
      returnObj[fileObj.filePath] = `${wikiFileName}.md`;
    }
    return returnObj;
  },
  removeFiles(filesToRemove: string[]): Promise<Array<void | Error>> {
    const cleanedFilesToRemove = filesToRemove.filter(file => file.length > 0);
    const removeMdFilePromises = cleanedFilesToRemove.map(file => fs.remove(file));
    return Promise.all(removeMdFilePromises);
  },
  moveFilesToWiki(filesToMove: {}[], thisObj: {
    cleanFilesToMove: (filesToMove: {}[]) => {}[]
  }): Promise<Array<void | Error>> {
    const cleanedFilesToMove = thisObj.cleanFilesToMove(filesToMove);
    const movedFiles = cleanedFilesToMove.map((wikiNameAndPath) => {
      const filePath = Object.keys(wikiNameAndPath)[0];
      const wikiName = wikiNameAndPath[filePath];
      let destinationPath = filePath.split('/');
      destinationPath.pop();
      destinationPath.pop();
      destinationPath = `${destinationPath.join('/')}/${wikiName}`;
      return fs.move(filePath, destinationPath);
    });
    return Promise.all(movedFiles);
  },
  cleanFilesToMove(filesToMove: {}[]): {}[] {
    let cleanedFilesToMove = filesToMove.filter(fileObj => Object.keys(fileObj).length > 0);
    cleanedFilesToMove = cleanedFilesToMove.filter((fileObj) => {
      const objectKey = Object.keys(fileObj)[0];
      return fileObj[objectKey].length > 0;
    });
    let existingFileNames = [];
    return cleanedFilesToMove.map((fileObj) => {
      const returnFileObj = {};
      const filePath = Object.keys(fileObj)[0];
      let wikiFileName = fileObj[Object.keys(fileObj)[0]];
      [wikiFileName, existingFileNames] = this.getUniqueFileName(wikiFileName, existingFileNames);
      existingFileNames.push(wikiFileName);
      returnFileObj[filePath] = wikiFileName;
      return returnFileObj;
    });
  },
  getUniqueFileName(fileName: string, existingNames: string[], dupCount: number, safety: number) {
    if (!existingNames.includes(fileName)) {
      return [fileName, existingNames];
    }

    let safetyCounter = safety;
    if (!safetyCounter) {
      safetyCounter = 1;
    } else if (safetyCounter > this.safetyCounterLimit) {
      return ['safetyCounterExceeded.md', existingNames];
    }
    safetyCounter += 1;

    const fileNameArray = fileName.split('.');
    fileNameArray.pop();
    let fileNameNoExtension = fileNameArray.join('.');
    let newDupCount = dupCount;
    if (!newDupCount) {
      newDupCount = 1;
    } else {
      newDupCount += 1;
    }
    const lastDupCount = `-(${newDupCount - 1})`;
    const fileNameNoExtensionArray = fileNameNoExtension.split(lastDupCount);
    if (fileNameNoExtensionArray.length > 1) {
      fileNameNoExtensionArray.pop();
    }
    fileNameNoExtension = fileNameNoExtensionArray.join(lastDupCount);
    const newFileName = `${fileNameNoExtension}-(${newDupCount}).md`;
    return this.getUniqueFileName(newFileName, existingNames, newDupCount, safetyCounter);
  },
  removeTempDir(wikiDirPath: string): Promise<void | Error> {
    return fs.remove(`${wikiDirPath}${this.tempWikiDir}`);
  },
};
