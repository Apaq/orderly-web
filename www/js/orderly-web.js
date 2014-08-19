function AppConfig($routeProvider, $locationProvider, $httpProvider, orderlyProvider) {
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
        .when('/calendar/:time*\/events', {
            templateUrl: 'views/calendar.html',
            controller: 'CalendarController'
        })
        .when('/calendar/:time*\/events/:eventId', {
            templateUrl: 'views/event.html',
            controller: 'EventController'
        })
        .when('/persons', {
            templateUrl: 'views/persons.html',
            controller: 'PersonListController'
        })
        .when('/login', {
            templateUrl: 'views/login.html',
            controller: 'LoginController'
        })
        .otherwise({
            redirectTo: '/login'
        });

}

function MenuController($scope) {
}

function LoginController($scope, LoginSvc, $location, $filter) {
    $scope.login = function () {
        LoginSvc.authenticate($scope.user, $scope.pass).then(function () {
            var time = $filter('date')(new Date(), 'yyyy/MM');
            $location.path('/calendar/' + time + '/events');
        });
    };
}

function PersonListController($scope, PersonSvc, RelationSvc, $modal, $log) {
    
    $scope._load = function() {
        $scope.relations = RelationSvc.query({id:$scope.context.relation.domain.id});
    };
    
    $scope.edit = function(person) {
        $scope._open(angular.copy(person));
    };
    
    $scope._open = function (person) {

        var modalInstance = $modal.open({
            templateUrl: 'views/person.html',
            controller: PersonController,
            size: 'md',
            resolve: {
                person: function () {
                    return person;
                }
            }
        });

        modalInstance.result.then(function (event) {
            PersonSvc.save({id:event.id}, event).$promise.then($scope._load);
            
        }, function (reason) {
            $log.info('Modal dismissed at: ' + new Date());
        });
    };
    
    $scope._load();
}

function PersonController($scope, $log, person, PersonSvc, $modalInstance) {
    $scope.person = person;
    
    
    $scope.ok = function () {
        $modalInstance.close($scope.person);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    $scope.delete = function () {
        if (confirm("Delete?")) {
            PersonSvc.remove({
                id: $scope.person.id
            }).$promise.then(function () {
                $modalInstance.dismiss('deleted');
            });
        }
    };
}


function EventController($scope, EventSvc, $log, $location, event, $window, PersonSvc, $modalInstance) {
    $scope.event = event;
    $scope.edit = {};
    
    // INIT
    if($scope.event.agendas && $scope.event.agendas.length>0) {
        $scope.selectedAgenda = $scope.event.agendas[0];
    } else {
        $scope.selectedAgenda = null;
    }

    if($scope.selectedAgenda !== null && $scope.selectedAgenda.tasks && $scope.selectedAgenda.tasks.length) {
        $scope.selectedTask = $scope.selectedAgenda.tasks[0];
    } else {
        $scope.selectedTask = null;
    }
    
    $scope.persons = PersonSvc.query({
        domain: $scope.context.relation.domain.id
    });
    
    $scope.edit.time = new Date($scope.event.startTime.getTime());
    
    // WATCH
    $scope.$watch(function() {
            var time = $scope.edit.time ? $scope.edit.time.getTime() : -1;
            return time;
        }, function() {
            if($scope.edit.time) {
                $scope.event.startTime.setHours($scope.edit.time.getHours());
                $scope.event.startTime.setMinutes($scope.edit.time.getMinutes());
            }
    });
    
    
    // FUNCTIONS
    $scope.alert = function(text) {
        alert(text);
        return false;
    };

    $scope.ok = function () {
        $modalInstance.close($scope.event);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    $scope.delete = function () {
        if (confirm("Delete?")) {
            EventSvc.remove({
                id: $scope.event.id
            }).$promise.then(function () {
                $modalInstance.dismiss('deleted');
            });
        }
    };
}

function CalendarController($scope, EventSvc, $log, $location, $routeParams, $filter, $modal) {

    var time = $routeParams.time;
    if (time != null) {
        var timeData = time.split("/");
        for (var i = timeData.length; i < 3; i++) {
            timeData.push("1");
        }
        $scope.date = new Date(Date.parse(timeData.join('-')));
    } else {
        $scope.date = new Date();
    }

    $scope.open = function (size, event) {

        var modalInstance = $modal.open({
            templateUrl: 'views/event.html',
            controller: EventController,
            size: size,
            resolve: {
                event: function () {
                    return event;
                }
            }
        });

        modalInstance.result.then(function (event) {
            EventSvc.save({id:event.id}, event).$promise.then(function() {
                $scope.calendarObj.fullCalendar('refetchEvents');
            });
            
        }, function (reason) {
            if(reason === 'deleted') {
                $scope.calendarObj.fullCalendar('refetchEvents');
            }
            $log.info('Modal dismissed at: ' + new Date());
        });
    };

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
                    title: $scope.eventTypes[event.type],
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

    $scope.onEventClick = function (event, jsEvent, view) {
        EventSvc.get({id:event.orgEvent.id, mode:'full'}).$promise.then(function(fullEvent) {
            $scope.open('lg', fullEvent);
        });
        
        //$location.path($location.path() + "/" + event.orgEvent.id);
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
        var nextDate = new Date($scope.date.getTime());
        nextDate.setMonth(nextDate.getMonth() + 1);
        $location.path('/calendar/' + $filter('date')(nextDate, 'yyyy/MM') + '/events');
        //$scope.calendarObj.fullCalendar('next');
    };

    $scope.prev = function () {
        var nextDate = new Date($scope.date.getTime());
        nextDate.setMonth(nextDate.getMonth() - 1);
        $location.path('/calendar/' + $filter('date')(nextDate, 'yyyy/MM') + '/events');
        //$scope.calendarObj.fullCalendar('prev');
    };


    $scope.addEvent = function (date, jsEvent, view) {
        var startTime = new Date(date.getTime());
        var endTime = new Date(date.getTime());

        startTime.setHours(10);
        endTime.setHours(10);
        endTime.setMinutes(15);

        var type = 'FieldServiceMeeting';
        var event = angular.copy($scope.eventTemplates[type]);
        event.domain.id = $scope.context.relation.domain.id;
        event.startTime = startTime;
        //event.endTime = endTime;
        
        $scope.open('lg', event);
        /**if (confirm("Save?")) {
            EventSvc.save(event).$promise.then(function() {
                $scope.calendarObj.fullCalendar('refetchEvents');
            });
        }*/
        //Pseduo
        //Add new event
        //Find event element in calendar
        //Use event for popover
    };

    /* config object */
    $scope.uiConfig = {
        calendar: {
            year: parseInt($filter('date')($scope.date, 'yyyy')),
            month: parseInt($filter('date')($scope.date, 'M')) - 1,
            date: parseInt($filter('date')($scope.date, 'd')),
            timeFormat: 'H(:mm)',
            height: 650,
            editable: true,
            header: {
                left: 'title',
                center: '',
                right: 'today prev,next'
            },
            eventClick: $scope.onEventClick,
            eventDrop: $scope.onDrop,
            eventResize: $scope.alertOnResize,
            dayClick: $scope.addEvent,
            eventRender: function (event, element) {

                //                element.attr('tabindex', '0');
                //                element.attr('ng-keypress', 'onKeyPress($event)');
                //                element.attr('unselectable', 'off');
            }
        }
    };


    /* event sources array*/
    $scope.eventSources = [$scope.eventsF];
    $scope.eventSources2 = [$scope.calEventsExt, $scope.eventsF, $scope.events];
}

function FieldServiceMeetingFormDirective() {
    return {
        restrict: 'E',
        scope: {
            task: '=',
            persons: '='
        },
        link: function (scope, element, attrs) {
            if (!scope.task.assignments || scope.task.assignments.length === 0) {
                scope.task.assignments = [{
                    type: 'Conductor',
                    assignee: {
                        id: null
                    }
                }];
            }

        },
        templateUrl: 'views/field-service-meeting-directive.html'
    };
}

angular.module('orderly.web', ['ngRoute', 'orderly.services', 'ui.calendar', 'ui.bootstrap'])
    .config(AppConfig)
    .controller('LoginController', LoginController)
    .controller('MenuController', MenuController)
    .controller('PersonListController', PersonListController)
    .controller('CalendarController', CalendarController)
    .directive('fieldServiceMeeting', FieldServiceMeetingFormDirective)
    .run(function ($rootScope, $location, PersonSvc) {
        $rootScope.eventTypes = {
            FieldServiceMeeting: 'Samling',
            CongregationMeeting: 'Møde',
            PublicWitnessing: 'Offentlig forkyndelse'
        };
        
        $rootScope.taskTypes = {
            FieldServiceMeeting: 'Samling'
        };
        
        $rootScope.eventTemplates = {
            FieldServiceMeeting: {
                "domain": {
                    "id": null,
                },
                "startTime": null,
                "endTime": null,
                "type": "FieldServiceMeeting",
                "agendas": [
                    {
                        "tasks": [
                            {
                                "type": "FieldServiceMeeting",
                                "duration": 900000
                            }
                        ]
                    }
                ]
            }
        };
        
        $rootScope.context = {};
        
        
        $rootScope.$on("login", function (event, user) {
            $rootScope.context.user = user;
            $rootScope.context.relations = PersonSvc.relations({
                id: 'current'
            });
            $rootScope.context.relations.$promise.then(function () {
                if ($rootScope.context.relations.length > 0) {
                    $rootScope.context.relation = $rootScope.context.relations[0];
                } else {
                    alert('Ingen relation');
                }
            });
        });

        $rootScope.$on("logout", function () {
            $location.path('/login');
        });
        
        $location.path('/login');
    });