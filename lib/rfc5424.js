'use strict'

const moment = require('moment-timezone')
const stringify = require('fast-safe-stringify')
const through2 = require('through2')
const utils = require('./utils')

function messageBuilderFactory (options) {
  const version = 1
  return function (data) {
    const severity = utils.levelToSeverity(data.level)
    const pri = (8 * options.facility) + severity
    const tstamp = moment(data.time).tz(options.tz).format().toUpperCase()
    const hostname = data.hostname
    const appname = (options.appname !== 'none') ? options.appname : '-'
    const msgid = (data.req && data.req.id) ? data.req.id : '-'
    const structuredData = options.structuredData || '-'
    const header = `<${pri}>${version} ${tstamp} ${hostname} ${appname} ${data.pid} ${msgid} ${structuredData} `
    const message = buildMessage(data)
    return (options.cee && !options.messageOnly)
      ? `${header}@cee: ${message}${options.newline ? '\n' : ''}`
      : `${header}${message}${options.newline ? '\n' : ''}`
  }

  function buildMessage (data) {
    let message = {}
    if (options.messageOnly) {
      message = data.msg
      return message
    }

    if (options.includeProperties.length > 0) {
      options.includeProperties.forEach((p) => { message[p] = data[p] })
      message = stringify(message)
    } else {
      message = stringify(data)
    }

    return message
  }
}

module.exports = function (options) {
  const processMessage = messageBuilderFactory(options)
  return through2.obj(function transport (data, enc, cb) {
    const output = processMessage(data)
    setImmediate(() => process.stdout.write(output))
    cb()
  })
}

module.exports.messageBuilderFactory = messageBuilderFactory
