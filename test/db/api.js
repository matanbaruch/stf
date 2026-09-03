var Module = require('module')

var chai = require('chai')
var expect = chai.expect

// Stub the db module in the require cache before lib/db/api pulls it in: requiring it for real
// opens a RethinkDB connection, and these tests only care about the document a write would send.
var dbPath = require.resolve('../../lib/db')
var calls = []

require.cache[dbPath] = new Module(dbPath, null)
require.cache[dbPath].filename = dbPath
require.cache[dbPath].loaded = true
require.cache[dbPath].exports = {
  run: function(query) {
    calls.push(query.build())
    return {replaced: 1}
  }
}

var dbapi = require('../../lib/db/api')

// The built term is [UPDATE, [[target], {document}]], so the document is the last argument.
function writtenBy(fn) {
  calls = []
  fn()
  expect(calls).to.have.lengthOf(1)
  return calls[0][1][1]
}

describe('dbapi device presence', function() {
  describe('setDeviceAbsent', function() {
    it('should clear ready so a departed device stops reporting itself as ready', function() {
      var doc = writtenBy(function() {
        return dbapi.setDeviceAbsent('serial')
      })
      expect(doc.present).to.equal(false)
      expect(doc.ready).to.equal(false)
    })
  })

  describe('setDevicePresent', function() {
    // Deliberately asymmetric: only a device worker reaching "Fully operational" may set ready,
    // so marking a device present must not guess at it.
    it('should not touch ready', function() {
      var doc = writtenBy(function() {
        return dbapi.setDevicePresent('serial')
      })
      expect(doc.present).to.equal(true)
      expect(doc).to.not.have.property('ready')
    })
  })

  describe('setDeviceReady', function() {
    it('should set ready and hand the device back with no owner', function() {
      var doc = writtenBy(function() {
        return dbapi.setDeviceReady('serial', 'channel')
      })
      expect(doc.ready).to.equal(true)
      expect(doc.owner).to.equal(null)
    })
  })
})
