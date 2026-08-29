describe('MenuCtrl', function() {
  beforeEach(angular.mock.module(require('./').name))

  var scope, common

  beforeEach(inject(function($rootScope, $controller, CommonService) {
    scope = $rootScope.$new()
    common = CommonService
    $controller('MenuCtrl', {$scope: scope})
  }))

  it('should not register NativeUrlService', inject(function($injector) {
    expect($injector.has('NativeUrlService')).toBe(false)
  }))

  // the one native url the menu opens goes through CommonService, which is why
  // nothing ever injected NativeUrlService
  it('should open the support address through CommonService', function() {
    spyOn(common, 'url')
    scope.contactEmail = 'support@example.com'
    scope.mailToSupport()

    expect(common.url).toHaveBeenCalledWith('mailto:support@example.com')
  })

  it('should treat an alert as active only for the string True', function() {
    scope.alertMessage = {activation: 'True'}
    expect(scope.isAlertMessageActive()).toBe(true)

    scope.alertMessage = {activation: true}
    expect(scope.isAlertMessageActive()).toBe(false)
  })
})
