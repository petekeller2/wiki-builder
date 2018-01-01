Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _shelljs = require('shelljs');

var _shelljs2 = _interopRequireDefault(_shelljs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

exports['default'] = {
  tempWikiDir: 'tempMdFiles',
  wikiConfigFileName: 'wikiConfig.json',
  buildWiki: function () {
    async function buildWiki() {
      var wikiConfig = await this.getWikiConfigData(this.findWikiConfigPath());
      var wikiDirPath = wikiConfig.wikiDirPath,
          ignoreMdTitles = wikiConfig.ignoreMdTitles;

      await this.ensureWikiDir(wikiDirPath);
      await this.removeMdFilesInWikiDir(wikiDirPath);
      await this.copyFilesToTempDir(wikiConfig);
      var filesInTempDir = await this.readFilesInTempDir(wikiDirPath);
      var filesToRemove = await this.findFilesToRemoveByTitle(filesInTempDir, ignoreMdTitles);
      var x = await this.removeMdFilesByTitle(filesToRemove);
      console.log(x);
      // await this.cleanFilesInTempDir();
      // await this.moveCleanFilesToWiki();
      // await this.deleteTempDir();
    }

    return buildWiki;
  }(),
  findWikiConfigPath: function () {
    function findWikiConfigPath() {
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
        return _this.cleanWikiConfigData(wikiConfig);
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

      cleanedWikiConfig.wikiDirPath = wikiConfig.wikiDirPath.trim();
      if (cleanedWikiConfig.wikiDirPath.slice(-1) !== '/') {
        cleanedWikiConfig.wikiDirPath += '/';
      }

      cleanedWikiConfig.projectDirPath = wikiConfig.projectDirPath.trim();
      if (cleanedWikiConfig.projectDirPath.length === 0) {
        cleanedWikiConfig.projectDirPath = './';
      } else if (cleanedWikiConfig.projectDirPath.slice(-1) !== '/') {
        cleanedWikiConfig.projectDirPath += '/';
      }

      cleanedWikiConfig.ignoreMdFiles = wikiConfig.ignoreMdFiles.map(function (file) {
        return file.trim();
      }).filter(function (file) {
        return file.length > 0;
      });

      cleanedWikiConfig.ignoreMdTitles = wikiConfig.ignoreMdTitles.map(function (file) {
        return file.trim().toLocaleLowerCase();
      }).filter(function (file) {
        return file.length > 0;
      });

      return cleanedWikiConfig;
    }

    return cleanWikiConfigData;
  }(),
  ensureWikiDir: function () {
    function ensureWikiDir(wikiDirPath) {
      return _fsExtra2['default'].ensureDir(wikiDirPath);
    }

    return ensureWikiDir;
  }(),
  getMdFilesInDir: function () {
    function getMdFilesInDir(dirPath, dirType) {
      return new Promise(function (resolve, reject) {
        (0, _glob2['default'])('' + String(dirPath) + (dirType.toLowerCase() === 'project' ? '{/**,/}' : '/') + '*.md', function (er, files) {
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
      var copyMdFilePromises = mdFiles.map(function (file) {
        var splitFile = file.split('/');
        var fileName = splitFile.pop();
        var fileNameNoFileType = fileName.split('.').shift();
        var fileNamesToIgnore = [file, fileName, fileNameNoFileType];
        if (!ignoreMdFiles.some(function (ignore) {
          return fileNamesToIgnore.includes(ignore);
        })) {
          return _fsExtra2['default'].copy(file, String(wikiDirPath) + '/' + String(_this2.tempWikiDir) + '/' + String(fileName));
        }
        return '';
      });
      return Promise.all(copyMdFilePromises);
    }

    return copyFilesToTempDir;
  }(),
  getFilesInTempDir: function () {
    function getFilesInTempDir(wikiDirPath) {
      return _fsExtra2['default'].readdir(String(wikiDirPath) + '/' + String(this.tempWikiDir));
    }

    return getFilesInTempDir;
  }(),
  readFilesInTempDir: function () {
    async function readFilesInTempDir(wikiDirPath) {
      var filesInTempDir = await this.getFilesInTempDir(wikiDirPath);
      var fileAndBuffer = filesInTempDir.map(function (file) {
        return {
          file: file,
          buffer: _fsExtra2['default'].readFile(file)
        };
      });
      return Promise.all(fileAndBuffer);
    }

    return readFilesInTempDir;
  }(),
  findFilesToRemoveByTitle: function () {
    function findFilesToRemoveByTitle(filesInTempDir, ignoreMdTitles) {
      var filesToRemove = filesInTempDir.map(async function (fileObj) {
        var buffer = await fileObj.buffer;
        var lines = buffer.toString('utf-8').split('\n');
        lines.map(function (line) {
          return line.replace('#', '');
        }).map(function (line) {
          return line.trim();
        }).filter(function (line) {
          return line.length > 0;
        });
        if (ignoreMdTitles.includes(lines[0])) {
          return fileObj.file;
        }
        return '';
      });
      return Promise.all(filesToRemove);
    }

    return findFilesToRemoveByTitle;
  }(),
  removeMdFilesByTitle: function () {
    function removeMdFilesByTitle(filesToRemove) {
      var cleanedFilesToRemove = filesToRemove.filter(function (file) {
        return file.length > 0;
      });
      var removeMdFilePromises = cleanedFilesToRemove.map(function (file) {
        return _fsExtra2['default'].remove(file);
      });
      return Promise.all(removeMdFilePromises);
    }

    return removeMdFilesByTitle;
  }(),
  cleanFilesInTempDir: function () {
    function cleanFilesInTempDir() {}

    return cleanFilesInTempDir;
  }(),
  moveCleanFilesToWiki: function () {
    function moveCleanFilesToWiki() {}

    return moveCleanFilesToWiki;
  }(),
  deleteTempDir: function () {
    function deleteTempDir() {}

    return deleteTempDir;
  }()
};
