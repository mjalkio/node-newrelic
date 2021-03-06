'use strict'

var test    = require('tap').test
var request = require('request').defaults({json: true})
var helper  = require('../../lib/agent_helper')
var API     = require('../../../api')


test("Restify router introspection", function(t) {
  t.plan(7)

  var agent  = helper.instrumentMockedAgent()
  var api    = new API(agent)
  var server = require('restify').createServer()


  t.tearDown(function() {
    server.close(function() {
      helper.unloadAgent(agent)
    })
  })

  agent.on('transactionFinished', function(transaction) {
    t.equal(transaction.name, 'WebTransaction/Restify/GET//polling/:id',
            "transaction has expected name even on error")
    t.ok(transaction.ignore, "transaction is ignored")

    t.notOk(agent.traces.trace, "should have no transaction trace")

    var metrics = agent.metrics.unscoped
    t.equal(Object.keys(metrics).length, 1,
      "only supportability metrics added to agent collection"
    )

    var errors = agent.errors.errors
    t.equal(errors.length, 0, "no errors noticed")
  })

  server.get('/polling/:id', function(req, res, next) {
    api.setIgnoreTransaction(true)

    res.send(400, {status : 'pollpollpoll'})
    next()
  })

  server.listen(0, function() {
    var port = server.address().port
    var url = 'http://localhost:' + port + '/polling/31337'
    request.get(url, function(error, res, body) {
      t.equal(res.statusCode, 400, "got expected error")
      t.deepEqual(body, {status : 'pollpollpoll'}, "got expected response")
    })
  })
})
