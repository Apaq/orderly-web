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
        .when('/forgot-password', {
            templateUrl: 'views/newpassword.html',
            controller: 'NewPasswordController'
        })
        .when('/admin/domains', {
            templateUrl: 'views/admin_domains.html',
            controller: 'AdminDomainListController'
        })
        .when('/admin/persons', {
            templateUrl: 'views/admin_persons.html',
            controller: 'AdminPersonListController'
        })
        .when('/profile', {
            templateUrl: 'views/profile.html',
            controller: 'ProfileController'
        })
        .otherwise({
            redirectTo: '/login'
        });

}

function MenuController($scope, $location, LoginSvc, $route) {
    $scope.selectDomain = function (relation) {
        $scope.context.relation = relation;
        $scope.context.mode = 'domain';
        $scope.context.adminMode = false;
        $location.path('/calendar');
        $route.reload();
    };

    $scope.selectAdminMode = function () {
        delete $scope.context.relation;
        $scope.context.mode = 'admin';
        $location.path('/admin/domains');
        $route.reload();
    };
    
    $scope.selectProfile = function () {
        delete $scope.context.relation;
        $scope.context.mode = 'profile';
        $location.path('/profile');
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

function LoginController($scope, LoginSvc, $location, $log, $animate) {
    $scope.loggingIn = false;
    $scope.login = function () {
        $scope.loggingIn = true;
        LoginSvc.authenticate($scope.user, $scope.pass, $scope.rememberMe).then(function () {
            $location.path('/calendar');
        }, function(reason) {
            $scope.loggingIn = false;
            $log.info("Error while authenticating: " + reason);
            var el = angular.element('#loginform-wrapper');
            $animate.addClass(el, 'invalid-login', function() {
                $animate.removeClass(el, 'invalid-login');
            });
        });
    };
    
    $scope.requestPassword = function() {
        $location.path('/forgot-password');
    };
}

function NewPasswordController($scope, SystemSvc) {
    $scope.step = 1;
    $scope.changingStep = false;
    $scope.data = {
        emailAddress: ''
    };
    
    $scope.next = function () {
        switch($scope.step) {
            case 1:
                SystemSvc.getSecurityQuestionType($scope.data.emailAddress).then(function(securityQuestionType) {
                    $scope.data.securityQuestionType = securityQuestionType;
                    $scope.step = 2;
                }, function(reason) {
                    alert(reason);
                });
                break;
            case 2: 
                SystemSvc.regeneratePassword($scope.data.emailAddress, $scope.data.securityQuestionType, $scope.data.securityQuestionAnswer).then(function() {
                    $scope.step = 3;
                }, function(reason) {
                    alert(reason);
                });
                break;
                
        }
    };
}

function ProfileController($scope, SystemSvc) {
    $scope.person = null;
    $scope.newPasswordRequest = {oldPassword:'', newPassword:'', newPassword2:''};
    $scope.changePassword = function() {
        if($scope.newPasswordRequest.newPassword !== $scope.newPasswordRequest.newPassword2) {
            alert("The passwords does not match");
            return;
        }
        SystemSvc.changePassword($scope.newPasswordRequest.oldPassword, $scope.newPasswordRequest.newPassword).then(function() {
            alert("Password changed");
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
    
    $scope.changeCredentials = function(person) {
        $scope._open = function (person) {

        var modalInstance = $modal.open({
            templateUrl: 'views/admin_change-credentials.html',
            controller: AdminChangeCredentialsController,
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

    };

    $scope._open = function (person) {

        var modalInstance = $modal.open({
            templateUrl: 'views/admin_person.html',
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


function EventController($scope, EventSvc, $log, $location, event, $window, PersonSvc, $modalInstance, readonly) {
    $scope.event = event;
    $scope.readonly = readonly;
    $scope.edit = {};
    $scope.selection = {};

    // INIT
    if ($scope.event.agendas && $scope.event.agendas.length > 0) {
        $scope.selection.agenda = $scope.event.agendas[0];
    } else {
        $scope.selection.agenda = null;
    }

    if ($scope.selection.agenda !== null && $scope.selection.agenda.tasks && $scope.selection.agenda.tasks.length) {
        $scope.selection.task = $scope.selection.agenda.tasks[0];
    } else {
        $scope.selection.task = null;
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

    $scope.currentRange = null;
    
    $scope._canEdit = function() {
        var result = false;
        angular.forEach($scope.context.relation.roles, function(role) {
            if(role === 'Coordinator') {
                result = true;
            }
        });
        return result;
    };

    $scope.open = function (size, event, readonly) {

        var modalInstance = $modal.open({
            templateUrl: 'views/event.html',
            controller: EventController,
            size: size,
            resolve: {
                event: function () {
                    return event;
                },
                readonly: function() {
                    return readonly === true;
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

    $scope.print = function (type) {
        
        // First get all events
        EventSvc.query({
            domain: $scope.context.relation.domain.id,
            from: $scope.currentRange.start,
            to: $scope.currentRange.end,
            type: 'FieldServiceMeeting',
            mode: 'full'
        }).$promise.then(function (events) {
            events = $filter('orderBy')(events, 'startTime');
            var pdf = new jsPDF('p', 'pt', 'a4'),
                src, data = [],
                margins;
            
            pdf.setLineWidth(1).setFontSize(20);
            pdf.text("Samlinger for " + $scope.context.relation.domain.name, 30, 60);
            
            pdf.setLineWidth(1).setFontSize(14);
            margins = {
                left: 60,
                top: 40,
                right: 40,
                bottom: 60
            };

            angular.forEach(events, function (event) {
                var conductor = "";
                if (event.agendas && event.agendas.length > 0 &&
                    event.agendas[0].tasks && event.agendas[0].tasks.length > 0 &&
                    event.agendas[0].tasks[0].assignments && event.agendas[0].tasks[0].assignments.length > 0) {
                    angular.forEach(event.agendas[0].tasks[0].assignments, function (ass) {
                        if (ass.type === 'Conductor' && ass.assignee) {
                            conductor = ass.assignee.firstName + ' ' + ass.assignee.lastName;
                        }
                    });
                }
                data.push({
                    'Dato': $filter('date')(event.startTime, 'fullDate'),
                    'Tid': $filter('date')(event.startTime, 'shortTime'),
                    'Leder': conductor
                });
            });
            pdf.table(30, 100, data, ['Dato', 'Tid', 'Leder'], {
                printHeaders: true,
                autoSize: true,
                margins: margins
            });
            src = pdf.output('datauristring');
            window.open(src);
        });

    };

    /* event source that calls a function on every view switch */
    $scope.eventsF = function (start, end, callback) {
        if ($scope.context.relation) {
            EventSvc.query({
                domain: $scope.context.relation.domain.id,
                from: start,
                to: end
            }).$promise.then(function (events) {
                $scope.currentRange = {
                    start: start,
                    end: end
                };
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
            $scope.open('lg', fullEvent, !$scope._canEdit());
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
        if($scope._canEdit()) {
            var modalInstance = $modal.open({
            templateUrl: 'views/event-template-picker.html',
            controller: function($scope, $modalInstance) {
                $scope.data = {eventType:'FieldServiceMeeting'};
                
                $scope.ok = function () {
                    $modalInstance.close($scope.data.eventType);
                };

                $scope.cancel = function () {
                    $modalInstance.dismiss('cancel');
                };
            }
        });

        modalInstance.result.then(function (eventType) {
            var startTime = new Date(date.getTime());
            startTime.setHours(10);
            
            var event = angular.copy($scope.eventTemplates[eventType]);
            event.domain.id = $scope.context.relation.domain.id;
            event.startTime = startTime;
            
            EventSvc.save(event).$promise.then(function (event) {
                $scope.open('lg', event);
            });

            
        });

        } else {
            alert("Du har ikke tilladelse til at oprette nye begivenheder.");
        }
    };

    /* config object */
    $scope.uiConfig = {
        calendar: {
            dayNames: $locale.DATETIME_FORMATS.DAY,
            dayNamesShort: $locale.DATETIME_FORMATS.SHORTDAY,
            monthNames: $locale.DATETIME_FORMATS.MONTH,
            monthNamesShort: $locale.DATETIME_FORMATS.SHORTMONTH,
            timeFormat: 'H(:mm)',
            axisFormat: 'H(:mm)',
            firstDay: 1,
            height: 650,
            editable: true,
            eventClick: $scope.onEventClick,
            eventDrop: $scope.onDrop,
            eventResize: $scope.alertOnResize,
            viewRender: $scope.updateDate,
            dayClick: $scope.addEvent,
            eventRender: $scope._renderEvent,
            allDaySlot: false,
            minTime: '7:30',
            maxTime: '22.30'
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
                        domain: function () {
                            return scope.domain;
                        }
                    }
                });

                modalInstance.result.then(function (changedRelation) {
                    var promises = [];
                    promises.push(PersonSvc.save({
                        id: relation.person.id
                    }, changedRelation.person).$promise);

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
            persons: '=',
            readonly: '='
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

function WitnessingFormDirective() {
    return {
        restrict: 'E',
        scope: {
            task: '=',
            persons: '=',
            readonly: '='
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
            
            if (scope.task.assignments.length < 2) {
                scope.task.assignments.push({
                    type: 'Assistant',
                    assignee: {
                        id: null
                    }
                });
            }

        },
        templateUrl: 'views/witnessing-directive.html'
    };
}

angular.module('orderly.web', ['ngRoute', 'ngAnimate', 'orderly.services', 'ui.calendar', 'ui.bootstrap'])
    .config(AppConfig)
    .controller('LoginController', LoginController)
    .controller('NewPasswordController', NewPasswordController)
    .controller('ProfileController', ProfileController)
    .controller('MenuController', MenuController)
    .controller('RelationListController', RelationListController)
    .controller('CalendarController', CalendarController)
    .controller('AdminDomainListController', AdminDomainListController)
    .controller('AdminPersonListController', AdminPersonListController)
    .directive('relationList', RelationListDirective)
    .directive('personForm', PersonFormDirective)
    .directive('fieldServiceMeeting', FieldServiceMeetingFormDirective)
    .directive('witnessing', WitnessingFormDirective)
    .run(function ($rootScope, $location, PersonSvc, $route, LoginSvc) {
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
                                "duration": 15
                            }
                        ]
                    }
                ]
            },
            PublicWitnessing: {
                "domain": {
                    "id": null,
                },
                "startTime": null,
                "endTime": null,
                "type": "PublicWitnessing",
                "agendas": [
                    {
                        "tasks": [
                            {
                                "type": "Witnessing",
                                "duration": 120
                            },
                            {
                                "type": "Witnessing",
                                "duration": 120
                            },
                            {
                                "type": "Witnessing",
                                "duration": 120
                            },
                            {
                                "type": "Witnessing",
                                "duration": 120
                            },
                            {
                                "type": "Witnessing",
                                "duration": 120
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
                    $rootScope.context.mode = 'domain';
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

        LoginSvc.authenticate().then(function() {
            $location.path('/calendar');
        }, function() {
            $location.path('/login');
        });
        
    });