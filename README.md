# Gource Gravatar

Download gravatar images of authors (git) from `git shortlog -s -n -e` command with Node.JS.

## Usage
```bash
npm start <path> [outFolder]
# or
node server.js <path> [outFolder]
```

- The `path` arguments is required and need point to git folder
- The `outFolder` is optional, this folder is based on `path` path by default is defined
  to `.git/gravatar`
