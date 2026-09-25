var events = require('events')

var expect = require('chai').expect
var sinon = require('sinon')

var wire = require('../../lib/wire')
var lifecycle = require('../../lib/util/lifecycle')
var group = require('../../lib/units/device/plugins/group')

function setup() {
  var handlers = {}
  var router = {
    on: function(type, handler) {
      handlers[type.$code] = handler
      return router
    }
  }
  var push = {send: sinon.spy()}
  var sub = {subscribe: sinon.spy(), unsubscribe: sinon.spy()}
  var channels = new events.EventEmitter()
  channels.register = sinon.spy()
  channels.unregister = sinon.spy()
  var service = {
    wake: sinon.spy()
  , acquireWakeLock: sinon.spy()
  }
  var plugin = group.invoke(
    {serial: 'test-device', groupTimeout: 1000}
  , {channel: 'solo-channel'}
  , {}
  , service
  , router
  , push
  , sub
  , channels
  )
  return {plugin: plugin, handlers: handlers, push: push}
}

function autoGroup(handlers, identifier) {
  var owner = new wire.OwnerMessage('a@example.com', 'a', 'group-channel')
  return handlers[wire.AutoGroupMessage.$code](
    'channel'
  , new wire.AutoGroupMessage(owner, identifier)
  )
}

describe('Device group plugin', function() {
  beforeEach(function() {
    sinon.stub(lifecycle, 'observe')
  })

  afterEach(function() {
    sinon.restore()
  })

  it('should pass the autojoin identifier to join listeners', function() {
    var context = setup()
    var joins = []
    context.plugin.on('join', function(joined, identifier) {
      joins.push(identifier)
    })

    return autoGroup(context.handlers, 'fingerprint').then(function() {
      expect(joins).to.eql(['fingerprint'])
    })
  })

  it('should not send the autojoin identifier as the usage', function() {
    var context = setup()

    return autoGroup(context.handlers, 'fingerprint').then(function() {
      var envelope = wire.Envelope.decode(context.push.send.firstCall.args[0][1])
      var message = wire.JoinGroupMessage.decode(envelope.message)
      expect(message.usage).to.not.equal('fingerprint')
    })
  })
})
