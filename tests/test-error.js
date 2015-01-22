var jaws = require('../index')
  , assert = require('assert')
  , request = require('request')
  ;

var app = jaws()

app.route('/error', function (req, resp) {
  process.nextTick(function () {
    resp.error(new Error('Something bad'))
  })
})
;
app.route('/non-predictable-error', function (req, resp) {
  resp.statusCode = 200
  delete resp.error
  process.nextTick(function () {
    resp.write('hi')
    // this will cause resp.error to be called, which will trigger a domain err
    console.info('Expecting an error to stdout:')
    resp.json()
  })
})
;

app.httpServer.listen(8080, function () {
  var testCount = 2
    , done = function done(){
      testCount--
      if (!testCount) app.httpServer.close()
    }

  request('http://localhost:8080/error', function (e, resp, b) {
    if (e) throw e
    assert.equal(resp.statusCode, 500)
    assert.equal(app.lru.has('/error'), false)
    done()
  })

  request('http://localhost:8080/non-predictable-error', function (e, resp, b) {
    if (e) throw e
    assert.equal(resp.statusCode, 200)
    assert.equal(app.lru.has('/non-predictable-error'), true)
    done()
  })
})
