// @flow
import fs from 'fs-extra';
import glob from 'glob';
import shell from 'shelljs';

export default {
  tempWikiDir: 'tempMdFiles',
  wikiConfigFileName: 'wikiConfig.json',
  async buildWiki() {
    const wikiConfig = await this.getWikiConfigData(this.findWikiConfigPath());
    const { wikiDirPath, ignoreMdTitles } = wikiConfig;
    await this.ensureWikiDir(wikiDirPath);
    await this.removeMdFilesInWikiDir(wikiDirPath);
    await this.copyFilesToTempDir(wikiConfig);
    const filesInTempDir = await this.readFilesInTempDir(wikiDirPath);
    const filesToRemove = await this.findFilesToRemoveByTitle(filesInTempDir, ignoreMdTitles);
    await this.removeMdFilesByTitle(filesToRemove);
    // await this.cleanFilesInTempDir();
    // await this.moveCleanFilesToWiki();
    // await this.deleteTempDir();
  },
  findWikiConfigPath(): string {
    const regex = new RegExp(`${this.wikiConfigFileName}$`, 'g');
    return shell.find('.').filter(file => file.match(regex)).pop();
  },
  getWikiConfigData(wikiStringPath: string): {
    wikiDirPath: string,
    projectDirPath: string,
    ignoreMdFiles: string[],
    ignoreMdTitles: string[]
  } {
    return fs.readJson(wikiStringPath)
      .then(wikiConfig => this.cleanWikiConfigData(wikiConfig))
      .catch((err) => {
        console.error(err);
        return {};
      });
  },
  cleanWikiConfigData(wikiConfig: {
    wikiDirPath: string,
    projectDirPath: string,
    ignoreMdFiles: string[],
    ignoreMdTitles: string[]
  }): {
    wikiDirPath: string,
    projectDirPath: string,
    ignoreMdFiles: string[],
    ignoreMdTitles: string[]
  } {
    const cleanedWikiConfig = {};

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

    cleanedWikiConfig.ignoreMdFiles = wikiConfig.ignoreMdFiles
      .map(file => file.trim())
      .filter(file => file.length > 0);

    cleanedWikiConfig.ignoreMdTitles = wikiConfig.ignoreMdTitles
      .map(file => file.trim().toLocaleLowerCase())
      .filter(file => file.length > 0);

    return cleanedWikiConfig;
  },
  ensureWikiDir(wikiDirPath: string): Promise<void | Error> {
    return fs.ensureDir(wikiDirPath);
  },
  getMdFilesInDir(dirPath: string, dirType: string): Promise<[] | Error> {
    return new Promise((resolve, reject) => {
      glob(`${dirPath}${dirType.toLowerCase() === 'project' ? '{/**,/}' : '/'}*.md`, (er, files) => {
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
  async copyFilesToTempDir(wikiConfig: {
    wikiDirPath: string,
    projectDirPath: string,
    ignoreMdFiles: string[],
    ignoreMdTitles: string[]
  }): Promise<Array<void | string | Error>> {
    const { wikiDirPath, projectDirPath, ignoreMdFiles } = wikiConfig;
    const mdFiles = await this.getMdFilesInDir(projectDirPath, 'project');
    const copyMdFilePromises = mdFiles.map((file) => {
      const splitFile = file.split('/');
      const fileName = splitFile.pop();
      const fileNameNoFileType = fileName.split('.').shift();
      const fileNamesToIgnore = [file, fileName, fileNameNoFileType];
      if (!ignoreMdFiles.some(ignore => fileNamesToIgnore.includes(ignore))) {
        return fs.copy(file, `${wikiDirPath}/${this.tempWikiDir}/${fileName}`);
      }
      return '';
    });
    return Promise.all(copyMdFilePromises);
  },
  getFilesInTempDir(wikiDirPath: string): Promise<Array<string | Error>> {
    return fs.readdir(`${wikiDirPath}/${this.tempWikiDir}`);
  },
  async readFilesInTempDir(wikiDirPath: string): Promise<Array<Object | Error>> {
    const filesInTempDir = await this.getFilesInTempDir(wikiDirPath);
    const fileAndBuffer = filesInTempDir.map(file => ({
      file,
      buffer: fs.readFile(file),
    }));
    return Promise.all(fileAndBuffer);
  },
  findFilesToRemoveByTitle(filesInTempDir: Object[], ignoreMdTitles: string[]): Promise<string[]> {
    const filesToRemove = filesInTempDir.map(async (fileObj) => {
      const buffer = await fileObj.buffer;
      const lines = buffer.toString('utf-8').split('\n');
      lines
        .map(line => line.replace('#', ''))
        .map(line => line.trim())
        .filter(line => line.length > 0);
      if (ignoreMdTitles.includes(lines[0])) {
        return fileObj.file;
      }
      return '';
    });
    return Promise.all(filesToRemove);
  },
  removeMdFilesByTitle(filesToRemove: string[]): Promise<Array<void | Error>> {
    const cleanedFilesToRemove = filesToRemove.filter(file => file.length > 0);
    const removeMdFilePromises = cleanedFilesToRemove.map(file => fs.remove(file));
    return Promise.all(removeMdFilePromises);
  },
  cleanFilesInTempDir() {

  },
  moveCleanFilesToWiki() {

  },
  deleteTempDir() {

  },
};
