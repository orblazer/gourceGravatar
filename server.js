const args = require('minimist')(process.argv.slice(2))._
const path = require('path')
const fs = require('fs')
const mkDirP = require('mkdirp').sync
const { exec } = require('child_process')
const md5 = require('md5')
const http = require('http')

if(args.length === 0) {
  console.log('Command usage: server.js <path> [outFolder]')
}

const tty = process.platform === 'win32' ? 'CON' : '/dev/tty'
const folder = path.resolve(args[0])
const outFolder = path.resolve(folder, args[1] || path.join('.git', 'gravatar'))

if (!fs.existsSync(folder)) {
  return runError(`The path '${folder}' doesn't exist`)
}
if (!fs.existsSync(folder + path.sep + '.git')) {
  return runError(`The path '${folder}' is not git folder`)
}

removeRecursive(outFolder)
mkDirP(outFolder, 0o777)

exec('git shortlog -s -n -e < ' + tty, {
  cwd: folder,
  timeout: 1000
}, (err, stdout) => {
  if (err) return runError(err.message)

  let nbUsers = 0
  let nbFiles = 0

  const promises = []
  stdout.trim().split('\n').forEach(line => {
    const [matches, username, email] = line.match(/^[0-9]+\s*([^<]+)\s*<([^>]+)>$/i)
    nbUsers++

    promises.push(
      download('http://www.gravatar.com/avatar/' + md5(email) + '?s=100', path.join(outFolder, username + '.jpg'))
      .then(({ statusCode, url }) => console.log(`GET ${statusCode} ${url}`)))
    nbFiles++
  })

  Promise.all(promises).then(() => {
    console.log(`\n# Gravatar icons downloaded to '${outFolder}' (${nbFiles} files of ${nbUsers} users) #`)
    process.exit(0)
  })
})

function download (url, filename) {
  return new Promise(resolve => {
    const file = fs.createWriteStream(filename)

    http.get(url, (res) => {
      res.pipe(file)
      file.on('finish', () => {
        file.close(() => resolve({ statusCode: res.statusCode, url }))
      })

    }).on('error', (err) => {
      fs.unlinkSync(file)
      throw err
    })
  })
}

function removeRecursive (path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file) => {
      const curPath = path + "/" + file
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        removeRecursive(curPath)
      } else { // delete file
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
}

function runError (message) {
  console.error(message)
  process.exit(1)
}
