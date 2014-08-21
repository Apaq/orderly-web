/*global angular*/
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
        .when('/calendar', {
            templateUrl: 'views/calendar.html',
            controller: 'CalendarController'
        })
        .when('/persons', {
            templateUrl: 'views/relations.html',
            controller: 'RelationListController'
        })
        .when('/login', {
            templateUrl: 'views/login.html',
            controller: 'LoginController'
        })
        .when('/admin/domains', {
            templateUrl: 'views/admin_domains.html',
            controller: 'AdminDomainListController'
        })
        .when('/admin/persons', {
            templateUrl: 'views/admin_persons.html',
            controller: 'AdminPersonListController'
        })
        .otherwise({
            redirectTo: '/login'
        });

}

function MenuController($scope, $location, LoginSvc, $route) {
    $scope.selectDomain = function (relation) {
        $scope.context.relation = relation;
        $scope.context.adminMode = false;
        $location.path('/calendar');
        $route.reload();
    };

    $scope.selectAdminMode = function () {
        delete $scope.context.relation;
        $scope.context.adminMode = true;
        $location.path('/admin/domains');
        $route.reload();
    };

    $scope.currentArea = function () {
        var path = $location.path(),
            pathElements;
        if (path.length > 0 && path.charAt(0) === '/') {
            path = path.substr(1);
        }

        pathElements = path.split('/');
        return pathElements[0];
    };

    $scope.logout = function () {
        LoginSvc.deauthenticate();
    };
}

function LoginController($scope, LoginSvc, $location, $log) {
    $scope.login = function () {
        LoginSvc.authenticate($scope.user, $scope.pass).then(function () {
            $location.path('/calendar');
        });
    };
}

function EntityEditorController($scope, entity, $modalInstance) {
    $scope.entity = entity;

    $scope.ok = function () {
        $modalInstance.close($scope.entity);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    $scope.delete = function () {
        $modalInstance.dismiss('delete');
    };
}

function AdminDomainListController($scope, DomainSvc, $modal, $log) {
    $scope._load = function () {
        $scope.domains = DomainSvc.query();
    };

    $scope.addDomain = function () {
        $scope._open({
            name: '',
            type: 'Congregation'
        });
    };

    $scope.editDomain = function (domain) {
        $scope._open(angular.copy(domain));
    };

    $scope.editRelations = function (domain) {
        $scope._openRelations(domain);
    };

    $scope._open = function (domain) {

        var modalInstance = $modal.open({
            templateUrl: 'views/domain.html',
            controller: EntityEditorController,
            size: 'md',
            resolve: {
                entity: function () {
                    return domain;
                }
            }
        });

        modalInstance.result.then(function (domain) {
            DomainSvc.save({
                id: domain.id
            }, domain).$promise.then($scope._load);

        }, function (reason) {
            if (reason === 'delete') {
                if (confirm("Are you sure you want to delete the domain?")) {
                    DomainSvc.remove({
                        id: domain.id
                    }).$promise.then($scope._load);
                }
            }
            $log.info('Modal dismissed at: ' + new Date());
        });
    };

    $scope._openRelations = function (domain) {

        var modalInstance = $modal.open({
            templateUrl: 'views/admin_domain-relations.html',
            controller: function ($scope, $modalInstance, domain) {
                $scope.domain = domain;
                $scope.close = function () {
                    $modalInstance.dismiss('close');
                };
            },
            size: 'lg',
            resolve: {
                domain: function () {
                    return domain;
                }
            }
        });

        modalInstance.result.then(null, function (reason) {
            $log.info('Modal dismissed at: ' + new Date());
        });
    };

    $scope._load();
}

function AdminPersonListController($scope, PersonSvc, $modal, $log) {
    $scope._load = function () {
        $scope.persons = PersonSvc.query();
    };

    $scope.editPerson = function (person) {
        $scope._open(angular.copy(person));
    };

    $scope.addPerson = function () {
        $scope._open({
            sex: 'Male'
        });
    };

    $scope._open = function (person) {

        var modalInstance = $modal.open({
            templateUrl: 'views/person.html',
            controller: EntityEditorController,
            size: 'md',
            resolve: {
                entity: function () {
                    return person;
                }
            }
        });

        modalInstance.result.then(function (person) {
            PersonSvc.save({
                id: person.id
            }, person).$promise.then($scope._load);

        }, function (reason) {
            if (reason === 'delete') {
                if (confirm("Are you sure you want to delete the person?")) {
                    PersonSvc.remove({
                        id: person.id
                    }).$promise.then($scope._load);
                }
            }
            $log.info('Modal dismissed at: ' + new Date());
        });
    };

    $scope._load();
}

function RelationListController($scope, PersonSvc, RelationSvc) {

}

function RelationController($scope, $log, relation, domain, RelationSvc, PersonSvc, $modalInstance) {
    $scope.relation = relation;
    $scope.person = relation.person;
    $scope.domain = domain;

    $scope.isValidForDomain = function (role) {
        return $scope.relationRoleDomainTypes[role].indexOf($scope.domain.type) >= 0;
    };


    $scope.toggleRole = function (role) {
        var idx = $scope.relation.roles.indexOf(role);

        // is currently selected
        if (idx > -1) {
            $scope.relation.roles.splice(idx, 1);
        }

        // is newly selected
        else {
            $scope.relation.roles.push(role);
        }
    };

    $scope.ok = function () {
        $modalInstance.close($scope.relation);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    $scope.delete = function () {
        $modalInstance.dismiss('delete');
    };
}


function EventController($scope, EventSvc, $log, $location, event, $window, PersonSvc, $modalInstance) {
    $scope.event = event;
    $scope.edit = {};

    // INIT
    if ($scope.event.agendas && $scope.event.agendas.length > 0) {
        $scope.selectedAgenda = $scope.event.agendas[0];
    } else {
        $scope.selectedAgenda = null;
    }

    if ($scope.selectedAgenda !== null && $scope.selectedAgenda.tasks && $scope.selectedAgenda.tasks.length) {
        $scope.selectedTask = $scope.selectedAgenda.tasks[0];
    } else {
        $scope.selectedTask = null;
    }

    $scope.persons = PersonSvc.query({
        domain: $scope.context.relation.domain.id
    });

    $scope.edit.time = new Date($scope.event.startTime.getTime());

    // WATCH
    $scope.$watch(function () {
        var time = $scope.edit.time ? $scope.edit.time.getTime() : -1;
        return time;
    }, function () {
        if ($scope.edit.time) {
            $scope.event.startTime.setHours($scope.edit.time.getHours());
            $scope.event.startTime.setMinutes($scope.edit.time.getMinutes());
        }
    });


    // FUNCTIONS
    $scope.alert = function (text) {
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

function CalendarController($scope, EventSvc, $log, $location, $filter, $modal, $locale) {

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
            EventSvc.save({
                id: event.id
            }, event).$promise.then(function () {
                $scope.calendarObj.fullCalendar('refetchEvents');
            });

        }, function (reason) {
            if (reason === 'deleted') {
                $scope.calendarObj.fullCalendar('refetchEvents');
            }
            $log.info('Modal dismissed at: ' + new Date());
        });
    };

    /* event source that calls a function on every view switch */
    $scope.eventsF = function (start, end, callback) {
        if($scope.context.relation) {
            EventSvc.query({
                domain: $scope.context.relation.domain.id,
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
                        durationEditable: false,
                        orgEvent: event
                    });
                });
                callback(tEvents);
            });
        } else {
            callback([]);
        }
    };

    $scope.onEventClick = function (event, jsEvent, view) {
        EventSvc.get({
            id: event.orgEvent.id,
            mode: 'full'
        }).$promise.then(function (fullEvent) {
            $scope.open('lg', fullEvent);
        });

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
    };

    $scope.updateDate = function (view, element) {
        $scope.date = $scope.calendarObj.fullCalendar('getDate');
    };

    /* alert on Resize */
    $scope.alertOnResize = function (event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view) {
        $scope.alertMessage = ('Event Resized to make dayDelta ' + minuteDelta);
    };

    /* Change View */
    $scope.changeView = function (view) {
        $scope.calendarObj.fullCalendar('changeView', view);
    };

    $scope.getView = function () {
        if ($scope.calendarObj) {
            var view = $scope.calendarObj.fullCalendar('getView');
            return view.name;
        } else {
            return null;
        }
    };


    $scope.next = function () {
        $scope.calendarObj.fullCalendar('next');
    };

    $scope.prev = function () {
        $scope.calendarObj.fullCalendar('prev');
    };

    $scope._renderEvent = function (event, element) {
        //                element.attr('tabindex', '0');
        //                element.attr('ng-keypress', 'onKeyPress($event)');
        //                element.attr('unselectable', 'off');
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
    };

    /* config object */
    $scope.uiConfig = {
        calendar: {
            dayNames: $locale.DATETIME_FORMATS.DAY,
            dayNamesShort: $locale.DATETIME_FORMATS.SHORTDAY,
            monthNames: $locale.DATETIME_FORMATS.MONTH,
            monthNamesShort: $locale.DATETIME_FORMATS.SHORTMONTH,
            timeFormat: 'H(:mm)',
            firstDay: 1,
            height: 650,
            editable: true,
            eventClick: $scope.onEventClick,
            eventDrop: $scope.onDrop,
            eventResize: $scope.alertOnResize,
            viewRender: $scope.updateDate,
            dayClick: $scope.addEvent,
            eventRender: $scope._renderEvent
        }
    };


    /* event sources array*/
    $scope.eventSources = [$scope.eventsF];
    $scope.eventSources2 = [$scope.calEventsExt, $scope.eventsF, $scope.events];
}

function RelationListDirective($log, $modal, RelationSvc, PersonSvc, $q) {
    return {
        restrict: 'E',
        scope: {
            domain: '='
        },
        link: function (scope, element, attrs) {
            scope._load = function () {
                if (scope.domain) {
                    scope.relations = RelationSvc.query({
                        domain: scope.domain.id
                    });
                }
            };

            scope.edit = function (relation) {
                scope._open(relation);
            };

            scope.addExistingUser = function () {
                var id = prompt("Type id of user"),
                    rel;
                rel = {
                    person: {
                        id: id
                    }
                };
                RelationSvc.save({
                    domain: scope.domain.id
                }, rel).$promise.then(scope._load);
            };

            scope._open = function (relation) {

                var modalInstance = $modal.open({
                    templateUrl: 'views/relation.html',
                    controller: RelationController,
                    size: 'md',
                    resolve: {
                        relation: function () {
                            return angular.copy(relation);
                        },
                        domain: function() {
                            return scope.domain;
                        }
                    }
                });

                modalInstance.result.then(function (changedRelation) {
                    var promises = [];
                    promises.push(PersonSvc.save({
                        id: relation.person.id
                    }, relation.person).$promise);

                    if (!angular.equals(relation.roles, changedRelation.roles)) {
                        promises.push(RelationSvc.save({
                            domain: scope.domain.id,
                            id: changedRelation.id
                        }, changedRelation).$promise);
                    }
                    $q.all(promises).then(scope._load);

                }, function (reason) {
                    if (reason === 'delete') {
                        if (scope.relation.person.enabled) {
                            if (confirm("Remove relation to user from the current domain?")) {
                                RelationSvc.remove({
                                    domain: scope.domain.id,
                                    id: relation.id
                                }).$promise.then(scope._load);
                            }
                        } else {
                            if (confirm("User is controlled by the current domain. Delete the user from the system?")) {
                                PersonSvc.remove({
                                    id: relation.person.id
                                }).$promise.then(scope._load);
                            }
                        }
                    }
                    $log.info('Modal dismissed at: ' + new Date());
                });
            };

            scope._load();
        },
        templateUrl: 'views/relation-list-directive.html'
    };
}

function PersonFormDirective() {
    return {
        restrict: 'E',
        scope: {
            person: '='
        },
        templateUrl: 'views/person-form-directive.html'
    };
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
    .controller('RelationListController', RelationListController)
    .controller('CalendarController', CalendarController)
    .controller('AdminDomainListController', AdminDomainListController)
    .controller('AdminPersonListController', AdminPersonListController)
    .directive('relationList', RelationListDirective)
    .directive('personForm', PersonFormDirective)
    .directive('fieldServiceMeeting', FieldServiceMeetingFormDirective)
    .run(function ($rootScope, $location, PersonSvc, $route) {
        $rootScope.eventTypes = {
            FieldServiceMeeting: 'Samling',
            CongregationMeeting: 'Møde',
            PublicWitnessing: 'Offentlig forkyndelse'
        };

        $rootScope.taskTypes = {
            FieldServiceMeeting: 'Samling',
            Song: 'Sang',
            Prayer: 'Bøn',
            Talk: 'Foredrag',
            Public_Talk: 'Offentligt foredrag',
            Watchtower_Study: 'Vagttårnsstudie',
            BibleStudy: 'Menighedsbibelstudie',
            BibleReading: 'Bibellæsning',
            SchoolBibleRecitation: 'BibelOplæsning',
            SchoolAssignment: 'Elevopgave',
            SchoolReview: 'Mundtlig repetition',
            Witnessing: 'Forkyndelse',
            ManageSound: 'Mikser',
            ManagePlatform: 'Platform',
            Cleaning: 'Rengøring'
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

        $rootScope.relationRoles = {
            Coordinator: "Kordinator",
            Elder: "Ældste",
            Secretary: "Sekretær",
            SchoolOverseer: "Skoletjener",
            ServiceOverseer: "Tjenestetilsynsmand"
        };

        $rootScope.relationRoleDomainTypes = {
            Coordinator: ['Congregation', 'Circuit', 'Region', 'ServiceGroup', 'ServiceUnit'],
            Elder: ['Congregation'],
            Secretary: ['Congregation'],
            SchoolOverseer: ['Congregation'],
            ServiceOverseer: ['Congregation']
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
                    $route.reload();
                } else {
                    alert('Ingen relation');
                }
            });
        });

        $rootScope.$on("logout", function () {
            $rootScope.context = {};
            $location.path('/login');
        });

        $location.path('/login');
    });