module.exports =
  function($scope, gettext, $location, $rootScope, ScopedHotkeysService,
    $window) {
    $scope.remotePaneSize = '30% + 2px'

    var actions = {
      deviceList: function() {
        $location.path('/devices/')
      }
      , switchCharset: function() {
        $scope.control.keyPress('switch_charset')
      }
      // TODO: Refactor this
      , rotateLeft: function() {
        var angle = 0
        if ($scope.device && $scope.device.display) {
          angle = $scope.device.display.rotation
        }
        if (angle === 0) {
          angle = 270
        }
        else {
          angle -= 90
        }
        $scope.control.rotate(angle)

        if ($rootScope.standalone) {
          $window.resizeTo($window.outerHeight, $window.outerWidth)
        }
      }
      , rotateRight: function() {
        var angle = 0
        if ($scope.device && $scope.device.display) {
          angle = $scope.device.display.rotation
        }
        if (angle === 270) {
          angle = 0
        }
        else {
          angle += 90
        }
        $scope.control.rotate(angle)

        if ($rootScope.standalone) {
          $window.resizeTo($window.outerHeight, $window.outerWidth)
        }
      }
      , pressMenu: function() {
        $scope.control.menu()
      }
      , pressHome: function() {
        $scope.control.home()
      }
      , pressBack: function() {
        $scope.control.back()
      }
      , pressAppSwitch: function() {
        $scope.control.appSwitch()
      }
      , togglePlatform: function() {
        if ($rootScope.platform === 'web') {
          $rootScope.platform = 'native'
        }
        else {
          $rootScope.platform = 'web'
        }
      }
    }

    ScopedHotkeysService($scope, [
      ['command+shift+d', gettext('Go to Device List'), actions.deviceList]

      , ['shift+space', gettext('Selects Next IME'), actions.switchCharset]
      , ['command+left', gettext('Rotate Left'), actions.rotateLeft]
      , ['command+right', gettext('Rotate Right'), actions.rotateRight]

      , ['command+shift+m', gettext('Press Menu button'), actions.pressMenu]
      , ['command+shift+h', gettext('Press Home button'), actions.pressHome]
      , ['command+shift+b', gettext('Press Back button'), actions.pressBack]

      , ['shift+w', gettext('Toggle Web/Native'), actions.togglePlatform, false]
    ])
  }
