describe('control-panes', function() {
  beforeEach(angular.mock.module(require('./').name))

  var routes
  beforeEach(inject(function($route) {
    routes = $route.routes
  }))

  it('should route /control at the no device controller', function() {
    expect(routes['/control'].controller)
      .toEqual('ControlPanesNoDeviceController')
  })

  it('should route /control/:serial at ControlPanesCtrl', function() {
    expect(routes['/control/:serial'].controller).toEqual('ControlPanesCtrl')
  })

  it('should route /c/:serial at ControlPanesCtrl', function() {
    expect(routes['/c/:serial'].controller).toEqual('ControlPanesCtrl')
  })
})
