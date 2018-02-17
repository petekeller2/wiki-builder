Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _shelljs = require('shelljs');

var _shelljs2 = _interopRequireDefault(_shelljs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

exports['default'] = {
  tempWikiDir: 'tempMdFiles',
  wikiConfigFileName: 'wikiConfig.json',
  safetyCounterLimit: 100,
  buildWiki: function () {
    async function buildWiki() {
      var wikiConfig = await this.getWikiConfigData((await this.findWikiConfigPath()));
      var wikiDirPath = wikiConfig.wikiDirPath,
          ignoreMdTitles = wikiConfig.ignoreMdTitles,
          statsEnabled = wikiConfig.statsEnabled;


      await _fsExtra2['default'].ensureDir(wikiDirPath);
      await this.removeMdFilesInWikiDir(wikiDirPath);
      await this.emptyTempWikiDir(wikiDirPath);
      await this.copyFilesToTempDir(wikiConfig);
      await this.createStatsIfEnabled(statsEnabled, wikiDirPath);

      var reduceActionSteps = new Map();
      reduceActionSteps.set([this.configIgnoreByTitle, [ignoreMdTitles]], [this.removeFiles, []]);
      reduceActionSteps.set([this.wikiFileNameByTitle, []], [this.moveFilesToWiki, [this]]);
      await this.readReduceAction(reduceActionSteps, wikiDirPath);

      await this.removeTempDir(wikiDirPath);
    }

    return buildWiki;
  }(),
  findWikiConfigPath: function () {
    async function findWikiConfigPath() {
      if (await _fsExtra2['default'].pathExists('./' + String(this.wikiConfigFileName))) {
        return this.wikiConfigFileName;
      }
      var regex = new RegExp(String(this.wikiConfigFileName) + '$', 'g');
      return _shelljs2['default'].find('.').filter(function (file) {
        return file.match(regex);
      }).pop();
    }

    return findWikiConfigPath;
  }(),
  getWikiConfigData: function () {
    function getWikiConfigData(wikiStringPath) {
      var _this = this;

      return _fsExtra2['default'].readJson(wikiStringPath).then(function (wikiConfig) {
        return _this.useGitignoredIfEnabled(_this.cleanWikiConfigData(wikiConfig));
      })['catch'](function (err) {
        console.error(err);
        return {};
      });
    }

    return getWikiConfigData;
  }(),
  cleanWikiConfigData: function () {
    function cleanWikiConfigData(wikiConfig) {
      var cleanedWikiConfig = {};

      cleanedWikiConfig.wikiDirPath = this.cleanWikiConfigPath(wikiConfig.wikiDirPath, './wiki/');
      cleanedWikiConfig.projectDirPath = this.cleanWikiConfigPath(wikiConfig.projectDirPath, './');
      cleanedWikiConfig.ignoreMdFiles = this.cleanWikiConfigArray(wikiConfig.ignoreMdFiles, 'lower');
      cleanedWikiConfig.ignoreDirs = this.cleanWikiConfigArray(wikiConfig.ignoreDirs, 'lower');
      cleanedWikiConfig.ignoreDirs.push('node_modules');
      cleanedWikiConfig.ignoreMdTitles = this.cleanWikiConfigArray(wikiConfig.ignoreMdTitles, 'lower');
      cleanedWikiConfig.statsEnabled = this.cleanWikiConfigBool(wikiConfig.statsEnabled);
      cleanedWikiConfig.useGitignore = this.cleanWikiConfigBool(wikiConfig.useGitignore, true);

      return cleanedWikiConfig;
    }

    return cleanWikiConfigData;
  }(),
  cleanWikiConfigPath: function () {
    function cleanWikiConfigPath(configPath, defaultPath) {
      var configPathReturn = configPath.trim();
      if (configPathReturn.length === 0) {
        configPathReturn = defaultPath;
      } else if (configPathReturn.slice(-1) !== '/') {
        configPathReturn += '/';
      }
      return configPathReturn;
    }

    return cleanWikiConfigPath;
  }(),
  cleanWikiConfigArray: function () {
    function cleanWikiConfigArray(configArray, caseFunc) {
      var configArrayReturn = configArray;
      if (!Array.isArray(configArray) && configArray) {
        if ((typeof configArray === 'undefined' ? 'undefined' : _typeof(configArray)) !== _typeof(true)) {
          configArrayReturn = [];
          configArrayReturn.push(String(configArray));
        }
      }
      return configArrayReturn.map(function (file) {
        var fileReturn = String(file).trim();
        if (caseFunc.toLowerCase() === 'lower') {
          fileReturn = fileReturn.toLowerCase();
        } else if (caseFunc.toLowerCase() === 'upper') {
          fileReturn = fileReturn.toUpperCase();
        }
        return fileReturn;
      }).filter(function (file) {
        return file.length > 0;
      });
    }

    return cleanWikiConfigArray;
  }(),
  cleanWikiConfigBool: function () {
    function cleanWikiConfigBool(configBool, defaultValue) {
      if (typeof configBool === 'string') {
        var firstChar = configBool.toLowerCase().trim().charAt(0);
        return Boolean(firstChar === 't' || firstChar === 'y');
      }
      if (defaultValue && configBool === undefined) {
        return defaultValue;
      }
      return Boolean(configBool);
    }

    return cleanWikiConfigBool;
  }(),
  emptyTempWikiDir: function () {
    async function emptyTempWikiDir(wikiDirPath) {
      var wikiTempDir = '' + String(wikiDirPath) + String(this.tempWikiDir);
      var pathExists = await _fsExtra2['default'].pathExists(wikiTempDir);
      if (pathExists) {
        return _fsExtra2['default'].emptyDir(wikiTempDir);
      }
      return _fsExtra2['default'].ensureDir(wikiTempDir);
    }

    return emptyTempWikiDir;
  }(),
  getMdFilesInDir: function () {
    function getMdFilesInDir(dirPath, dirType) {
      return new Promise(function (resolve, reject) {
        (0, _glob2['default'])('' + String(dirPath) + (dirType.toLowerCase() === 'project' ? '{/**/,/}' : '/') + '*.md', function (er, files) {
          if (er) {
            reject(er);
          } else {
            resolve(files);
          }
        });
      });
    }

    return getMdFilesInDir;
  }(),
  removeMdFilesInWikiDir: function () {
    async function removeMdFilesInWikiDir(wikiDirPath) {
      var mdFiles = await this.getMdFilesInDir(wikiDirPath, 'wiki');
      var removeMdFilePromises = mdFiles.map(function (file) {
        return _fsExtra2['default'].remove(file);
      });
      return Promise.all(removeMdFilePromises);
    }

    return removeMdFilesInWikiDir;
  }(),
  copyFilesToTempDir: function () {
    async function copyFilesToTempDir(wikiConfig) {
      var _this2 = this;

      var wikiDirPath = wikiConfig.wikiDirPath,
          projectDirPath = wikiConfig.projectDirPath,
          ignoreMdFiles = wikiConfig.ignoreMdFiles;

      var mdFiles = await this.getMdFilesInDir(projectDirPath, 'project');
      mdFiles = mdFiles.filter(this.ignoreDirsFilterCallback(wikiConfig.ignoreDirs));
      var i = 0;
      var copyMdFilePromises = mdFiles.map(function (file) {
        var splitFile = file.split('/');
        var fileName = splitFile.pop();
        var fileNameNoFileType = fileName.split('.').shift();
        var fileNamesToIgnore = [file, fileName, fileNameNoFileType];
        i += 1;
        var ignoreMdSpecificFiles = ignoreMdFiles.filter(function (f) {
          return f.includes('/');
        });
        var ignoreMdFileNames = ignoreMdFiles.filter(function (f) {
          return !f.includes('/');
        });
        if (!ignoreMdSpecificFiles.some(function (ignore) {
          return file === ignore;
        }) && !ignoreMdFileNames.some(function (ignore) {
          return fileNamesToIgnore.includes(ignore);
        })) {
          return _fsExtra2['default'].copy(file, '' + String(wikiDirPath) + String(_this2.tempWikiDir) + '/' + i + '.md');
        }
        return '';
      });
      return Promise.all(copyMdFilePromises);
    }

    return copyFilesToTempDir;
  }(),

  // A stats file will only be created for git repos with commits. Disabled by default
  createStatsIfEnabled: function () {
    async function createStatsIfEnabled(statsEnabled, wikiDirPath) {
      if (!statsEnabled) {
        return 'Stats not enabled';
      }
      var statsFile = String(wikiDirPath) + '/' + String(this.tempWikiDir) + '/Stats.md';
      var command = 'git diff --stat `git hash-object -t tree /dev/null`';
      command = command + ' > ' + statsFile;
      await new Promise(function (resolve, reject) {
        _shelljs2['default'].exec(command, function (code, stdout, stderr) {
          if (stderr) {
            reject(stderr);
          }
          resolve(stdout);
        });
      });
      var writeFileData = await new Promise(function (resolve, reject) {
        _fsExtra2['default'].readFile(statsFile, 'utf8', function (err, data) {
          if (err) reject(err);
          var newFileData = data.toString().split('\n');
          if (data.toString().length > 0) {
            newFileData.pop();
            var fileCountLineCount = newFileData.pop();
            var numberMatches = fileCountLineCount.match(/\d+/g);
            if (numberMatches[1].length > 0) {
              newFileData.push('### Total Lines of Code: ' + String(numberMatches[1]));
            }
            if (numberMatches[0].length > 0) {
              newFileData.splice(0, 0, '### Number of Files: ' + String(numberMatches[0]));
            }
            newFileData.splice(0, 0, '# Stats');
          }
          resolve(newFileData.join('\n\n'));
        });
      });
      if (writeFileData.length > 0) {
        return new Promise(function (resolve, reject) {
          _fsExtra2['default'].writeFile(statsFile, writeFileData, 'utf8', function (err) {
            if (err) reject(err);
            resolve('Stats file cleaned');
          });
        });
      }
      await _fsExtra2['default'].remove(statsFile);
      return 'Stats file removed because it was empty';
    }

    return createStatsIfEnabled;
  }(),

  // Updates the wikiConfig object. Enabled by default
  useGitignoredIfEnabled: function () {
    async function useGitignoredIfEnabled(wikiConfig) {
      var gitIgnoreFound = await _fsExtra2['default'].pathExists(String(wikiConfig.projectDirPath) + '.gitignore');
      if (wikiConfig.useGitignore && gitIgnoreFound) {
        var newWikiConfig = wikiConfig;
        var gitIgnoreFile = await _fsExtra2['default'].readFile(String(wikiConfig.projectDirPath) + '.gitignore', 'utf8');
        var gitIgnoreArray = gitIgnoreFile.split('\n');
        gitIgnoreArray.forEach(function (line) {
          var endOfPath = line.split('/').pop();
          if (line.slice(-1) === '/') {
            newWikiConfig.ignoreDirs.push(line);
          } else if (endOfPath.split('.').pop().toLowerCase() === 'md') {
            newWikiConfig.ignoreMdFiles.push(line);
          }
        });
        return newWikiConfig;
      }
      return wikiConfig;
    }

    return useGitignoredIfEnabled;
  }(),
  ignoreDirsFilterCallback: function () {
    function ignoreDirsFilterCallback(ignoreDirs) {
      return function (file) {
        return ignoreDirs.filter(function (ignoreDir) {
          return file.includes(ignoreDir);
        }).length === 0;
      };
    }

    return ignoreDirsFilterCallback;
  }(),

  //   Read: Reads md files in the temporary wiki directory.
  // Reduce: Passes read results, specific function and its extra arguments to a reduce function.
  // Action: Passes reduced results and extra action function arguments to an action function.
  // The name of the specific function determines which reduce function will be used.
  readReduceAction: function () {
    async function readReduceAction(reduceActionSteps, wikiDirPath, safety) {
      // ------------------------------- Safety Counter -------------------------------
      var safetyCounter = safety;
      if (!safetyCounter) {
        safetyCounter = 1;
      } else if (safetyCounter > this.safetyCounterLimit) {
        return new Error('readReduceAction went over safety counter');
      }
      safetyCounter += 1;
      // ------------- Get Functions and Extra Arguments for Next Section -------------
      var mapKeyValue = reduceActionSteps.entries().next().value;
      if (!mapKeyValue) {
        return new Error('No reduceActionSteps');
      }

      var _mapKeyValue = _slicedToArray(mapKeyValue, 2),
          mapKey = _mapKeyValue[0],
          mapValue = _mapKeyValue[1];

      var _mapKey = _slicedToArray(mapKey, 2),
          specificFunc = _mapKey[0],
          extraSpecificArgs = _mapKey[1];

      var _mapValue = _slicedToArray(mapValue, 2),
          actionOnReducedFunc = _mapValue[0],
          extraActionArgs = _mapValue[1];

      var reduceFuncName = this.findReduceFuncName(specificFunc);
      if (!reduceFuncName) {
        return new Error('Reduce function for ' + String(specificFunc.name) + ' not found \n      (The pattern is ...By{x} for the specific function and ...By{x}Reduce for the reduce function).');
      }
      // ----------------------------- Read Reduce Action -----------------------------
      var filesInTempDir = await this.readFilesInTempDir(wikiDirPath);
      var reduced = await this[reduceFuncName](filesInTempDir, extraSpecificArgs, specificFunc);
      await actionOnReducedFunc.apply(undefined, [reduced].concat(_toConsumableArray(extraActionArgs)));
      // ------------------ Recursive Function Call or Termination --------------------
      if (reduceActionSteps.size !== 1) {
        reduceActionSteps['delete'](mapKey);
        return this.readReduceAction(reduceActionSteps, wikiDirPath, safetyCounter);
      }
      return undefined;
    }

    return readReduceAction;
  }(),

  // Reduce Function (for readReduceAction)
  findReduceFuncName: function () {
    function findReduceFuncName(specificFunc) {
      var _this3 = this;

      var matchResults = specificFunc.name.match(/By(.*)/);
      if (matchResults) {
        var reduceNameSearch = 'By' + String(matchResults[1]);
        return Object.keys(this).find(function (prop) {
          if (prop && typeof _this3[prop] === 'function' && _this3[prop].name) {
            return _this3[prop].name.endsWith(reduceNameSearch + 'Reduce');
          }
          return false;
        });
      }
      return undefined;
    }

    return findReduceFuncName;
  }(),
  getFilesInTempDir: function () {
    function getFilesInTempDir(wikiDirPath) {
      return _fsExtra2['default'].readdir('' + String(wikiDirPath) + String(this.tempWikiDir));
    }

    return getFilesInTempDir;
  }(),
  readFilesInTempDir: function () {
    async function readFilesInTempDir(wikiDirPath) {
      var _this4 = this;

      var filesInTempDir = await this.getFilesInTempDir(wikiDirPath);
      var filePaths = filesInTempDir.map(function (file) {
        return '' + String(wikiDirPath) + String(_this4.tempWikiDir) + '/' + String(file);
      });
      var fileAndBuffer = filePaths.map(function (file) {
        return {
          filePath: file,
          buffer: _fsExtra2['default'].readFile(file)
        };
      });
      return Promise.all(fileAndBuffer);
    }

    return readFilesInTempDir;
  }(),
  filesByTitleReduce: function () {
    function filesByTitleReduce(filesInTempDir, extraArgs, specificFunc) {
      return filesInTempDir.reduce(async function (accumulator, fileObj) {
        var awaitedAccumulator = await accumulator;
        var buffer = await fileObj.buffer;
        var lines = buffer.toString('utf-8').split('\n');
        lines = lines.map(function (line) {
          return line.replace(/#/, '').trim().toLowerCase();
        }).filter(function (line) {
          return line.length > 0;
        });
        var file = specificFunc.apply(undefined, [lines, fileObj].concat(_toConsumableArray(extraArgs)));
        if (file !== false) {
          awaitedAccumulator.push(file);
        }
        return awaitedAccumulator;
      }, Promise.resolve([]));
    }

    return filesByTitleReduce;
  }(),

  // Specific Function (for readReduceAction)
  configIgnoreByTitle: function () {
    function configIgnoreByTitle(lines, fileObj, ignoreTitles) {
      if (ignoreTitles.includes(lines.shift())) {
        return fileObj.filePath;
      }
      return false;
    }

    return configIgnoreByTitle;
  }(),

  // Specific Function (for readReduceAction)
  // returns { file path: wiki file name }
  wikiFileNameByTitle: function () {
    function wikiFileNameByTitle(lines, fileObj) {
      var returnObj = {};
      var wikiTitle = lines.shift();
      var wikiFileName = wikiTitle.replace(/\b\w/g, function (word) {
        return word.toUpperCase();
      });
      wikiFileName = wikiFileName.replace(/\s+/g, '-');
      if (fileObj.filePath) {
        returnObj[fileObj.filePath] = String(wikiFileName) + '.md';
      }
      return returnObj;
    }

    return wikiFileNameByTitle;
  }(),
  removeFiles: function () {
    function removeFiles(filesToRemove) {
      var cleanedFilesToRemove = filesToRemove.filter(function (file) {
        return file.length > 0;
      });
      var removeMdFilePromises = cleanedFilesToRemove.map(function (file) {
        return _fsExtra2['default'].remove(file);
      });
      return Promise.all(removeMdFilePromises);
    }

    return removeFiles;
  }(),
  moveFilesToWiki: function () {
    function moveFilesToWiki(filesToMove, thisObj) {
      var cleanedFilesToMove = thisObj.cleanFilesToMove(filesToMove);
      var movedFiles = cleanedFilesToMove.map(function (wikiNameAndPath) {
        var filePath = Object.keys(wikiNameAndPath)[0];
        var wikiName = wikiNameAndPath[filePath];
        var destinationPath = filePath.split('/');
        destinationPath.pop();
        destinationPath.pop();
        destinationPath = String(destinationPath.join('/')) + '/' + String(wikiName);
        return _fsExtra2['default'].move(filePath, destinationPath);
      });
      return Promise.all(movedFiles);
    }

    return moveFilesToWiki;
  }(),
  cleanFilesToMove: function () {
    function cleanFilesToMove(filesToMove) {
      var _this5 = this;

      var cleanedFilesToMove = filesToMove.filter(function (fileObj) {
        return Object.keys(fileObj).length > 0;
      });
      cleanedFilesToMove = cleanedFilesToMove.filter(function (fileObj) {
        var objectKey = Object.keys(fileObj)[0];
        return fileObj[objectKey].length > 0;
      });
      var existingFileNames = [];
      return cleanedFilesToMove.map(function (fileObj) {
        var returnFileObj = {};
        var filePath = Object.keys(fileObj)[0];
        var wikiFileName = fileObj[Object.keys(fileObj)[0]];

        var _getUniqueFileName = _this5.getUniqueFileName(wikiFileName, existingFileNames);

        var _getUniqueFileName2 = _slicedToArray(_getUniqueFileName, 2);

        wikiFileName = _getUniqueFileName2[0];
        existingFileNames = _getUniqueFileName2[1];

        existingFileNames.push(wikiFileName);
        returnFileObj[filePath] = wikiFileName;
        return returnFileObj;
      });
    }

    return cleanFilesToMove;
  }(),
  getUniqueFileName: function () {
    function getUniqueFileName(fileName, existingNames, dupCount, safety) {
      if (!existingNames.includes(fileName)) {
        return [fileName, existingNames];
      }

      var safetyCounter = safety;
      if (!safetyCounter) {
        safetyCounter = 1;
      } else if (safetyCounter > this.safetyCounterLimit) {
        return ['safetyCounterExceeded.md', existingNames];
      }
      safetyCounter += 1;

      var fileNameArray = fileName.split('.');
      fileNameArray.pop();
      var fileNameNoExtension = fileNameArray.join('.');
      var newDupCount = dupCount;
      if (!newDupCount) {
        newDupCount = 1;
      } else {
        newDupCount += 1;
      }
      var lastDupCount = '-(' + (newDupCount - 1) + ')';
      var fileNameNoExtensionArray = fileNameNoExtension.split(lastDupCount);
      if (fileNameNoExtensionArray.length > 1) {
        fileNameNoExtensionArray.pop();
      }
      fileNameNoExtension = fileNameNoExtensionArray.join(lastDupCount);
      var newFileName = String(fileNameNoExtension) + '-(' + String(newDupCount) + ').md';
      return this.getUniqueFileName(newFileName, existingNames, newDupCount, safetyCounter);
    }

    return getUniqueFileName;
  }(),
  removeTempDir: function () {
    function removeTempDir(wikiDirPath) {
      return _fsExtra2['default'].remove('' + String(wikiDirPath) + String(this.tempWikiDir));
    }

    return removeTempDir;
  }()
};
