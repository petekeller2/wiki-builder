Sync your github wiki with markdown
files in your project.

# Setup

`npm install wiki-builder --save-dev`

Create a file named wikiConfig.json

```
{
  "wikiDirPath": "",
  "projectDirPath": "",
  "ignoreMdFiles": [],
  "ignoreMdTitles": [],
  "ignoreDirs": [],
  "statsEnabled": false,
  "useGitignore": true
}
```

**wikiDirPath:** Path to wiki directory. ./wiki/ by default.

**projectDirPath:** Path to project directory. ./ by default.

**ignoreMdFiles:** List of files to not add to the wiki. 
To ignore specific files, include the path (example: ./readme.md) 
To ignore files by file name, don't include the path (example: readme.md)

**ignoreMdTitles:** Ignore by the first line of markdown files.

**ignoreDirs:** List of directories to ignore. Includes node_modules.

**statsEnabled:** Creates a stats markdown file for the wiki. A stats markdown file can 
only be created for git repos with commits. False by default.

**useGitignore:** Ignore directories and files in 
.gitignore. True by default.

# Usage

Run `wiki-builder`. Example usage package.json:
```
"scripts": {
    "wiki": "wiki-builder"
  }
```

`wiki-builder` puts files the 'wikiDirPath'. If this 
directory is not a submodule, [you can make it one.](https://brendancleary.com/2013/03/08/including-a-github-wiki-in-a-repository-as-a-submodule/)
