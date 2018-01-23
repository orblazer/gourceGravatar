const args = require('yargs').command('$0 <path> [outFolder]').argv
const path = require('path')
const fs = require('fs')
const mkDirP = require('mkdirp').sync
const { exec } = require('child_process')
const md5 = require('md5')
const request = require('request')

args.outFolder = args.outFolder || path.join('.git', 'gravatar')

const tty = process.platform === 'win32' ? 'CON' : '/dev/tty'
const folder = path.resolve(args.path)
const outFolder = path.resolve(folder, args.outFolder)

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

    promises.push(download('http://www.gravatar.com/avatar/' + md5(email) + '?s=100', path.join(outFolder, username + '.jpg')))
    nbFiles++
  })

  Promise.all(promises).then(() => {
    console.log(`\n# Gravatar icons downloaded to '${outFolder}' (${nbFiles} files of ${nbUsers} users) #`)
    process.exit(0)
  })
})

function download (uri, filename) {
  return new Promise(resolve => {
    request.head(uri, (err, res) => {
      console.log(`${res.method || 'GET'} ${res.statusCode} ${uri}`)
      /* console.log('  content-type:', res.headers['content-type'])
      console.log('  content-length:', res.headers['content-length']) */

      if (err) throw err

      request(uri).pipe(fs.createWriteStream(filename)).on('close', resolve)
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
