describe('ControlPanesHotKeysCtrl', function() {
  var emptyActions = [
    'previousDevice'
    , 'nextDevice'
    , 'focusUrlBar'
    , 'takeScreenShot'
    , 'toggleDevice'
    , 'scale'
  ]

  var hotkeySets = []

  beforeEach(angular.mock.module(require('./').name))

  beforeEach(angular.mock.module(function($provide) {
    $provide.value('gettext', function(str) {
      return str
    })
    $provide.value('ScopedHotkeysService', function(scope, hotkeySet) {
      hotkeySets.push(hotkeySet)
    })
  }))

  beforeEach(inject(function($rootScope, $controller) {
    hotkeySets.length = 0
    $controller('ControlPanesHotKeysCtrl', {$scope: $rootScope.$new()})
  }))

  it('should bind these hotkeys and no others', function() {
    expect(hotkeySets.length).toBe(1)
    expect(hotkeySets[0].map(function(binding) {
      return [binding[0], binding[1]]
    })).toEqual([
      ['command+shift+d', 'Go to Device List']
      , ['shift+space', 'Selects Next IME']
      , ['command+left', 'Rotate Left']
      , ['command+right', 'Rotate Right']
      , ['command+shift+m', 'Press Menu button']
      , ['command+shift+h', 'Press Home button']
      , ['command+shift+b', 'Press Back button']
      , ['shift+w', 'Toggle Web/Native']
    ])
  })

  it('should declare none of the actions that had an empty body', function() {
    var source = require('./control-panes-hotkeys-controller').toString()
    expect(emptyActions.filter(function(name) {
      return source.indexOf(name) !== -1
    })).toEqual([])
  })
})
