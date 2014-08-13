angular.module('orderly.web', ['ngRoute', 'orderly.services', 'ui.calendar', 'ui.bootstrap'])
    .config(function ($routeProvider, $locationProvider, $httpProvider, orderlyProvider) {
        //orderlyProvider.setServiceUrl('http://orderlyservice-apaq.rhcloud.com/');

        // SECURITY (forward to login if not authorized)
        $httpProvider.interceptors.push(function ($location) {
            return {
                'responseError': function (rejection) {
                    if (rejection.status === 401) {
                        $location.path('/login');
                    }
                    return rejection;
                }
            };
        });

        $routeProvider
            .when('/calendar', {
                templateUrl: 'views/calendar.html',
                controller: 'CalendarController'
            })
            .when('/login', {
                templateUrl: 'views/login.html',
                controller: 'LoginController'
            })
            .otherwise({
                redirectTo: '/login'
            });

    })

.controller('LoginController', function ($scope, LoginSvc, $location) {
    $scope.login = function () {
        LoginSvc.authenticate($scope.user, $scope.pass).then(function () {
            $location.path('/calendar');
        });
    }
})

.controller('CalendarController', function ($scope, EventSvc, $log) {

    $scope.date = new Date();
    $scope.selectedEvent;

    $scope.onKeyPress = function(event) {
        alert(event);
    };
    
    $scope.deselectEvent = function(event) {
        if (event.selected) {
            $scope.selectedEvent = null;
            event.selected = false;
            event.className.splice(1, 1);
            $scope.calendarObj.fullCalendar('updateEvent', event);
        }
    }
    
    $scope.selectEvent = function(event) {
        if (!event.selected) {
            $scope.selectedEvent = event;
            event.selected = true;
            event.className.push('selected');
            $scope.calendarObj.fullCalendar('updateEvent', event);
        }
    }
    
    $scope.changeTo = 'Hungarian';
    /* event source that calls a function on every view switch */
    $scope.eventsF = function (start, end, callback) {
        EventSvc.query({
            domain: '4028d7f246f261870146f261c6240000',
            from: start,
            to: end
        }).$promise.then(function (events) {
            var tEvents = [];
            angular.forEach(events, function (event) {
                tEvents.push({
                    title: event.type,
                    start: new Date(event.startTime.getTime()),
                    end: new Date(event.endTime.getTime()),
                    allDay: false,
                    className: ['field-service-meeting'],
                    orgEvent: event
                });
            });
            callback(tEvents);
        });
    };

    $scope.onEventClick = function (event, allDay, jsEvent, view) {
        angular.forEach($scope.calendarObj.fullCalendar('clientEvents'), function(currentEvent) {
            $scope.deselectEvent(currentEvent);
        });
                        
        $scope.selectEvent(event);

    };
    /* alert on Drop */
    $scope.onDrop = function (event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view) {
        var orgEvent = event.orgEvent;
        orgEvent.startTime.setDate(orgEvent.startTime.getDate() + dayDelta);
        EventSvc.save({
            id: orgEvent.id
        }, orgEvent).$promise.then(null, function (reason) {
            $log.info("Unable to save event after drop. Reason: " + reason);
            revertFunc();
        });
        //$scope.alertMessage = ('Event Droped to make dayDelta ' + dayDelta);
    };
    /* alert on Resize */
    $scope.alertOnResize = function (event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view) {
        $scope.alertMessage = ('Event Resized to make dayDelta ' + minuteDelta);
    };

    /* Change View */
    $scope.changeView = function (view, calendar) {
        calendar.fullCalendar('changeView', view);
    };
    /* Change View */
    $scope.renderCalender = function (calendar) {
        calendar.fullCalendar('render');
    };

    $scope.next = function () {
        $scope.calendarObj.fullCalendar('next');
    };

    $scope.prev = function () {
        $scope.calendarObj.fullCalendar('prev');
    };

    $scope.updateTitle = function () {
        $scope.date = $scope.calendarObj.fullCalendar('getDate');
    };

    $scope.addEvent = function (date, jsEvent, view) {
        var startTime = new Date(date.getTime());
        var endTime = new Date(date.getTime());

        startTime.setHours(10);
        endTime.setHours(10);
        endTime.setMinutes(15);

        var event = {
            "domain": {
                "id": "4028d7f246f261870146f261c6240000",
            },
            "startTime": startTime,
            "endTime": endTime,
            "type": "FieldsServiceMeeting"
        };

        if (confirm("Save?")) {
            EventSvc.save(event);
        }
        //Pseduo
        //Add new event
        //Find event element in calendar
        //Use event for popover
    }

    /* config object */
    $scope.uiConfig = {
        calendar: {
            height: 450,
            editable: true,
            header: {
                left: 'title',
                center: '',
                right: 'today prev,next'
            },
            eventClick: $scope.onEventClick,
            eventDrop: $scope.onDrop,
            eventResize: $scope.alertOnResize,
            eventAfterAllRender: $scope.updateTitle,
            dayClick: $scope.addEvent,
            eventRender: function(event, element) {
//                element.attr('tabindex', '0');
//                element.attr('ng-keypress', 'onKeyPress($event)');
//                element.attr('unselectable', 'off');
            }
        }
    };

    $scope.changeLang = function () {
        if ($scope.changeTo === 'Hungarian') {
            $scope.uiConfig.calendar.dayNames = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
            $scope.uiConfig.calendar.dayNamesShort = ["Vas", "Hét", "Kedd", "Sze", "Csüt", "Pén", "Szo"];
            $scope.changeTo = 'English';
        } else {
            $scope.uiConfig.calendar.dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            $scope.uiConfig.calendar.dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            $scope.changeTo = 'Hungarian';
        }
    };
    /* event sources array*/
    $scope.eventSources = [$scope.eventsF];
    $scope.eventSources2 = [$scope.calEventsExt, $scope.eventsF, $scope.events];
});