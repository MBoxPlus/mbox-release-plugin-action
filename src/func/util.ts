import * as fs from 'fs'

export function insertGemSource(file: string) {
  const data = fs.readFileSync(file)
  const fd = fs.openSync(file, 'w+')
  const buffer = Buffer.from("source 'https://rubygems.org'\n")

  fs.writeSync(fd, buffer, 0, buffer.length, 0)
  fs.writeSync(fd, data, 0, data.length, buffer.length)
  fs.closeSync(fd)
}
