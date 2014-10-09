/*global angular*/
function AppConfig($routeProvider, $locationProvider, $httpProvider, orderlyProvider, $translateProvider) {
    //orderlyProvider.setServiceUrl('http://146.185.167.121/');
    orderlyProvider.setServiceUrl('http://localhost:8084/');
    
    $translateProvider.useStaticFilesLoader({
          prefix: 'js/locale-',
          suffix: '.json'
    });
    $translateProvider.use('da');

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
            templateUrl: 'views/domain/calendar.html',
            controller: 'CalendarController'
        })
        .when('/persons', {
            templateUrl: 'views/domain/relations.html'
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
            templateUrl: 'views/admin/domains.html',
            controller: 'AdminDomainListController'
        })
        .when('/admin/persons', {
            templateUrl: 'views/admin/persons.html',
            controller: 'AdminPersonListController'
        })
        .when('/assignments', {
            templateUrl: 'views/profile/assignments.html',
            controller: 'AssignmentController'
        })
        .when('/profile', {
            templateUrl: 'views/profile/profile.html',
            controller: 'ProfileController'
        })
        .when('/password', {
            templateUrl: 'views/profile/password.html',
            controller: 'PasswordController'
        })
        .otherwise({
            redirectTo: '/login'
        });

}

function MenuController($scope, $location, LoginSvc, $route, LoadingIndicatorSvc) {
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
        $location.path('/assignments');
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
    
    $scope.isLoading = function() {
        return LoadingIndicatorSvc.isLoading();
    };
}

function LoginController($scope, LoginSvc, $location, $log, $animate) {
    $scope.loggingIn = false;
    $scope.login = function () {
        $scope.loggingIn = true;
        LoginSvc.authenticate($scope.user, $scope.pass, $scope.rememberMe).then(function () {
            $location.path('/calendar');
        }, function (reason) {
            $scope.loggingIn = false;
            $log.info("Error while authenticating: " + reason);
            var el = angular.element('#loginform-wrapper');
            $animate.addClass(el, 'invalid-login', function () {
                $animate.removeClass(el, 'invalid-login');
            });
        });
    };

    $scope.requestPassword = function () {
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
        switch ($scope.step) {
        case 1:
            SystemSvc.getSecurityQuestionType($scope.data.emailAddress).then(function (securityQuestionType) {
                $scope.data.securityQuestionType = securityQuestionType;
                $scope.step = 2;
            }, function (reason) {
                alert(reason);
            });
            break;
        case 2:
            SystemSvc.regeneratePassword($scope.data.emailAddress, $scope.data.securityQuestionAnswer).then(function () {
                $scope.step = 3;
            }, function (reason) {
                alert(reason);
            });
            break;

        }
    };
}

function ProfileController($scope) {
    $scope.person = null;

}

function PasswordController($scope, SystemSvc) {
    $scope.person = null;
    $scope.newPasswordRequest = {
        oldPassword: '',
        newPassword: '',
        newPassword2: ''
    };
    $scope.changePassword = function () {
        if ($scope.newPasswordRequest.newPassword !== $scope.newPasswordRequest.newPassword2) {
            alert("The passwords does not match");
            return;
        }
        SystemSvc.changePassword($scope.newPasswordRequest.oldPassword, $scope.newPasswordRequest.newPassword).then(function () {
            alert("Password changed");
        });
    };
}

function AssignmentController($scope, TaskSvc) {
    $scope.tasks = TaskSvc.query({
        persons: [$scope.context.user.id]
    });
    
    $scope.getAssignment = function(task, person) {
        for(var i = 0;i<task.assignments.length;i++) {
            if(task.assignments[i].assignee && 
                    task.assignments[i].assignee.id === $scope.context.user.id) {
                return task.assignments[i];
            }
        }
        return null;
    }
}

function AssigneePickerController($scope, relations, task, assignment, $modalInstance, TaskSvc, $filter) {
    $scope.task = task;
    $scope.assignment = assignment;
    $scope.relations = angular.copy(relations);
    $scope.assignee = null;
    $scope.loading = true;
    $scope.requirements = null;
    
    $scope.personIds = [];
    angular.forEach($scope.relations, function (relation) {
        $scope.personIds.push(relation.person.id);
        relation.lastAssignmentStartTime = null;
    });
    
    var updateLastAssignmentDates = function(tasks) {
        angular.forEach(tasks, function (task) {
            angular.forEach(task.assignments, function (assignment) {
                angular.forEach($scope.relations, function (relation) {
                    if (assignment.assignee &&
                            assignment.assignee.id === relation.person.id && 
                            $scope.assignment.type === assignment.type && 
                            $scope.task.type === task.type) {
                        relation.lastAssignmentStartTime = task.startTime;
                    }
                });
            });
        });
        $scope.loading = false;
    };
    
    $scope.updateRequirements = function() {
        var result = [];
        if($scope.assignment.meta['SuggestedSex']) {
            result.push($filter('translate')('GENERAL.' + $scope.assignment.meta['SuggestedSex'].toUpperCase()));
        }
        if($scope.assignment.meta['SuggestedRole']) {
            result.push($filter('translate')('RELATION_ROLES.' + $scope.assignment.meta['SuggestedRole']));
        }
        
        if(result.length > 0) {
            $scope.requirements = result.join(', ');
        }
    };


    $scope.historicAssignments = TaskSvc.query({
        persons: $scope.personIds,
        taskType: $scope.task.type,
        mode: 'singularity',
        order: 'desc'
    });
    $scope.historicAssignments.$promise.then(updateLastAssignmentDates);

    $scope.updateRequirements();

    $scope.select = function(assignee) {
        $scope.assignee = assignee;
    };

    $scope.ok = function () {
        $modalInstance.close($scope.assignee);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
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
            templateUrl: 'views/admin/domain.html',
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
            templateUrl: 'views/admin/domain-relations.html',
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

    $scope.changeCredentials = function (person) {
        $scope._open = function (person) {

            var modalInstance = $modal.open({
                templateUrl: 'views/admin/change-credentials.html',
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
            templateUrl: 'views/admin/person.html',
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

function RelationController($scope, $log, relation, domain, RelationSvc, PersonSvc, $modalInstance, RoleSvc) {
    $scope.relation = relation;
    $scope.person = relation.person;
    $scope.domain = domain;
    $scope.relationRoles = RoleSvc.get();
    $scope.isValidForDomain = function (role) {
        return $scope.relationRoles[role].indexOf($scope.domain.type) >= 0;
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

    $scope.selectTask = function (task) {
        $scope.selection.task = task;
    };

    // INIT
    $scope.init = function () {
        if ($scope.event.agendas && $scope.event.agendas.length > 0) {
            $scope.selection.agenda = $scope.event.agendas[0];
        } else {
            $scope.selection.agenda = null;
        }

        if ($scope.selection.agenda !== null && $scope.selection.agenda.tasks && $scope.selection.agenda.tasks.length) {
            $scope.selectTask($scope.selection.agenda.tasks[0]);
        } else {
            $scope.selectTask($scope.selection.task = null);
        }
    }

    $scope.persons = PersonSvc.query({
        domain: $scope.context.relation.domain.id
    });
    $scope.persons.$promise.then($scope.init);

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

    $scope.init();
}

function CalendarController($scope, EventSvc, $log, $filter, $modal, LoadingIndicatorSvc, $http, $filter) {

    $scope.date = new Date();
    
    $scope.$on('events-loading', function() {
        LoadingIndicatorSvc.setLoading(true);
    });
    
    $scope.$on('events-loaded', function(e, range) {
        LoadingIndicatorSvc.setLoading(false);
    });
    
    $scope.$on('day-clicked', function(e, date) {
        $scope.addEvent(date);
    });
    
    $scope.$on('event-clicked', function(e, event) {
        $scope.open('lg', event, !$scope.canEdit());
    });
    
    $scope.$on('range-changed', function(e, range) {
        $scope.currentRange = range;
    });
    
    $scope.$on('event-dropped', function(e, event, cancelFunc) {
       EventSvc.save({
            id: event.id
        }, event).$promise.then(null, function (reason) {
            $log.info("Unable to save event after drop. Reason: " + reason);
            cancelFunc();
        }); 
    });

    $scope.canEdit = function () {
        var result = false;
        if($scope.context.relation) {
            angular.forEach($scope.context.relation.roles, function (role) {
                if (role === 'Coordinator') {
                    result = true;
                }
            });
        }
        return result;
    };

    $scope.open = function (size, event, readonly) {

        var modalInstance = $modal.open({
            templateUrl: 'views/domain/event.html',
            controller: EventController,
            size: size,
            resolve: {
                event: function () {
                    return event;
                },
                readonly: function () {
                    return readonly === true;
                }
            }
        });

        modalInstance.result.then(function (event) {
            EventSvc.save({
                id: event.id
            }, event).$promise.then(function () {
                $scope.$broadcast('event-updated', event);
            });

        }, function (reason) {
            if (reason === 'deleted') {
                $scope.$broadcast('event-removed', event);
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

    $scope.next = function () {
        $scope.date.setMonth($scope.date.getMonth() + 1);
    };

    $scope.prev = function () {
        $scope.date.setMonth($scope.date.getMonth() - 1);
    };

    $scope.addEvent = function (date, jsEvent, view) {
        if ($scope.canEdit()) {
            var modalInstance = $modal.open({
                templateUrl: 'views/domain/event-template-picker.html',
                controller: function ($scope, $modalInstance) {
                    $scope.data = {
                        eventType: 'FieldServiceMeeting'
                    };

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

                $http.get('event-templates/' + eventType + '.json').success(function (event) {
                    event.domain.id = $scope.context.relation.domain.id;
                    event.startTime = startTime;
                    EventSvc.save(event).$promise.then(function (event) {
                        $scope.$broadcast('event-added', event);
                        $scope.open('lg', event);
                    });
                });

            });

        } else {
            alert("Du har ikke tilladelse til at oprette nye begivenheder.");
        }
    };

    
}

function RelationListDirective($log, $modal, RelationSvc, PersonSvc, $q, $rootScope) {
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
                    templateUrl: 'views/directives/relation.html',
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
                        if ($rootScope.context.relation.domain.type !== 'Congregation' || relation.person.enabled) {
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
        templateUrl: 'views/directives/relation-list.html'
    };
}

function PersonFormDirective() {
    return {
        restrict: 'E',
        scope: {
            person: '='
        },
        templateUrl: 'views/directives/person-form.html'
    };
}

function EventCalendarDirective(EventSvc, $locale, $filter) {
    return {
        restrict: 'E',
        scope: {
            date: '=',
            editable: '=',
            domain: '='
        },
        controller: function ($scope) {
            $scope.currentRange = null;
            $scope.currentEvents = null;
            
            $scope.$watch('date', function(date) {
                if(date && $scope.calendarObj) {
                    $scope.calendarObj.fullCalendar('gotoDate', date );
                }
            }, true);
            
            $scope.$on('event-added', function(e, event) {
                $scope.calendarObj.fullCalendar('renderEvent', $scope.toFullCalendarEvent(event));
            });
            
            $scope.$on('event-removed', function(e, event) {
                $scope.calendarObj.fullCalendar('removeEvents', event.id);
            });
            
            $scope.$on('event-updated', function(e, event) {
                $scope.calendarObj.fullCalendar('removeEvents', event.id);
                $scope.calendarObj.fullCalendar('renderEvent', $scope.toFullCalendarEvent(event));
            });
            
            $scope.toFullCalendarEvent = function(event) {
                return {
                    id: event.id,
                    title: $filter('translate')('EVENT_TYPES.' + event.type),
                    start: new Date(event.startTime.getTime()),
                    end: new Date(event.endTime.getTime()),
                    allDay: false,
                    className: ['field-service-meeting'],
                    durationEditable: false,
                    orgEvent: event
                };
            };
            
            $scope.eventsF = function (start, end, callback) {
                $scope.$emit('events-loading');
                if ($scope.domain) {
                    EventSvc.query({
                        domain: $scope.domain.id,
                        from: start,
                        to: end,
                        mode: 'full'
                    }).$promise.then(function (events) {
                        $scope.currentEvents = events;
                        $scope.currentRange = {
                            start: start,
                            end: end
                        };
                        var tEvents = [];
                        angular.forEach(events, function (event) {
                            tEvents.push($scope.toFullCalendarEvent(event));
                        });
                        callback(tEvents);
                        
                        $scope.$emit('range-changed', $scope.currentRange);
                        $scope.$emit('events-loaded', $scope.currentEvents);
                
                    });
                } else {
                    $scope.currentEvents = null;
                    callback([]);
                    $scope.$emit('events-loaded', $scope.currentEvents);
                }
                

            };

            $scope.onEventClick = function (event, jsEvent, view) {
                $scope.$emit('event-clicked', event.orgEvent);
            };

            $scope.onDrop = function (event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view) {
                var orgEvent = angular.copy(event.orgEvent), cancelFunc;
                orgEvent.startTime.setDate(orgEvent.startTime.getDate() + dayDelta);
                orgEvent.startTime.setMinutes(orgEvent.startTime.getMinutes() + minuteDelta);
                
                cancelFunc = function() {
                    revertFunc();
                };
                
                $scope.$emit('event-dropped', orgEvent, cancelFunc);
            };

            $scope._renderEvent = function (event, element, view) {
                event = event.orgEvent;
                var singleAgenda = event.agendas.length === 1;
                var singleTask = singleAgenda && event.agendas[0].tasks.length === 1;
                var singleAssignment = singleTask && event.agendas[0].tasks[0].assignments.length === 1;

                var singleAssignmentAssignee = singleAssignment && event.agendas[0].tasks[0].assignments[0].assignee;

                if (singleAssignmentAssignee) {
                    var name = singleAssignmentAssignee.firstName + ' ' + singleAssignmentAssignee.lastName;
                    element.find('.fc-event-inner').append('<span class="fc-event-title"> - ' + name + '</span>');
                }
                return element;
            };


            $scope.onDayClicked = function (date, jsEvent, view) {
                $scope.$emit('day-clicked', date);
            };

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
                    dayClick: $scope.onDayClicked,
                    eventRender: $scope._renderEvent,
                    allDaySlot: false,
                    minTime: '7:30',
                    maxTime: '22.30'
                }
            };

            $scope.eventSources = [$scope.eventsF];
        },
        templateUrl: 'views/directives/event-calendar.html'
    };
}

function EventTableDirective(RelationSvc, EventSvc, $modal, $log) {
    return {
        restrict: 'E',
        scope: {
            event: '='
        },
        link: function (scope, element, attrs) {
            scope.relations = RelationSvc.query({
                domain: scope.event.domain.id
            });
            
            scope.time = angular.copy(scope.event.startTime);
            
            scope.$watch(function () {
                var time = scope.time ? scope.time.getTime() : -1;
                return time;
            }, function () {
                if (scope.time) {
                    scope.event.startTime.setHours(scope.time.getHours());
                    scope.event.startTime.setMinutes(scope.time.getMinutes());
                    scope.updateTaskStartTimes();
                }
            });
            
            scope.$watch('event.startTime', scope.updateTaskStartTimes);
            
            scope.songs = [];
            for (i = 1; i <= 135; i++) {
                scope.songs.push(i.toString());
            }
            
            scope.updateTaskStartTimes = function() {
                var i, e, agenda, task, currentTime;
                for(i = 0;i<scope.event.agendas.length;i++) {
                    agenda = scope.event.agendas[i];
                    currentTime = angular.copy(scope.event.startTime);
                    for(e = 0;e<agenda.tasks.length;e++) {
                        task = agenda.tasks[e];
                        task.startTime = angular.copy(currentTime);
                        currentTime.setMinutes(currentTime.getMinutes() + task.duration);
                    }
                }
            };
            
            scope.getMaxNumberOfTasks = function() {
                var count = 0, range, i;
                angular.forEach(scope.event.agendas, function(agenda) {
                   if(agenda.tasks.length > count) {
                       count = agenda.tasks.length;
                   } 
                });
                return count;   
            };
            
            scope.getTaskRange = function() {
                var count = scope.getMaxNumberOfTasks(), range = [], i;
                for(i = 0;i<count;i++) {
                    range.push(i);
                }
                return range;
            };
            
            scope.getRowSpan = function(agenda) {
                var maxTasks = scope.getMaxNumberOfTasks();
                var result =  parseInt(maxTasks / agenda.tasks.length);
                return result;
            };
            
            scope.isTaskComplete = function(task) {
                var i, result = true;
                if(angular.isArray(task.assignments)) {
                    for(i=0;i<task.assignments.length;i++) {
                        if(!task.assignments[i].assignee) {
                            result = false;
                            break;
                        }
                    }
                } else {
                    result = false;
                }
                return result;
            };

            scope.isAgendaComplete = function(agenda) {
                var i, result = true;
                if(angular.isArray(agenda.tasks)) {
                    for(i=0;i<agenda.tasks.length;i++) {
                        if(!scope.isTaskComplete(agenda.tasks[i])) {
                            result = false;
                            break;
                        }
                    }
                } else {
                    result = false;
                }
                return result;
            };
    
            scope.isEventComplete = function(event) {
                var i, result = true;
                if(angular.isArray(event.agendas)) {
                    for(i=0;i<event.agendas.length;i++) {
                        if(!scope.isAgendaComplete(event.agendas[i])) {
                            result = false;
                            break;
                        }
                    }
                } else {
                    result = false;
                }
                return result;
            };
            
            scope.editTask = function(task) {
                alert("Edit");
            };
            
            scope.generateTitle = function(task) {
                var title = task.duration + ' min.';
                if(task.meta.Curriculum) {
                    title += ": " + task.meta.Curriculum;
                }
                return title;
            };
            
            scope.selectAssignee = function (task, assignment) {

                    var modalInstance = $modal.open({
                        templateUrl: 'views/domain/assignee-picker.html',
                        controller: AssigneePickerController,
                        size: 'sm',
                        resolve: {
                            task: function () {
                                return task;
                            },
                            relations: function () {
                                return scope.relations;
                            },
                            assignment: function () {
                                return assignment;
                            }
                        }
                    });

                    modalInstance.result.then(function (assignee) {
                        assignment.assignee = assignee;
                        EventSvc.save({
                            id: scope.event.id
                        }, scope.event);
                    }, function (reason) {
                        $log.info('Modal dismissed at: ' + new Date());
                    });
                };
        },
        templateUrl: 'views/directives/event-table.html'
    };
}

function TaskEditorDirective($filter, $modal, $log) {
    return {
        restrict: 'E',
        scope: {
            task: '=',
            relations: '=',
            readonly: '='
        },
        link: function (scope, element, attrs) {
            var i;
            scope.historicAssignmentsType = null;
            scope.historicAssignments = null;

            scope.initTask = function () {
                if (!scope.task) {
                    return;
                }

                scope.hasConductor = scope.task.type !== 'Song';
                scope.hasAssistent = ['WatchtowerStudy', 'BibleStudy', 'SchoolAssignment', 'SchoolReview', 'Witnessing'].indexOf(scope.task.type) >= 0;
                scope.isSong = scope.task.type === 'Song';

                scope.songs = [];
                for (i = 1; i <= 135; i++) {
                    scope.songs.push(i.toString());
                }

                scope.selectAssignee = function (assignment) {

                    var modalInstance = $modal.open({
                        templateUrl: 'views/domain/assignee-picker.html',
                        controller: AssigneePickerController,
                        size: 'md',
                        resolve: {
                            task: function () {
                                return scope.task;
                            },
                            relations: function () {
                                return scope.relations;
                            },
                            assignment: function () {
                                return assignment;
                            }
                        }
                    });

                    modalInstance.result.then(function (assignee) {
                        assignment.assignee = assignee;

                    }, function (reason) {
                        $log.info('Modal dismissed at: ' + new Date());
                    });
                };
            };

            scope.generateTitle = function (person) {
                return person.firstName + ' ' + person.lastName;
            };

            scope.$watch('task', scope.initTask);
            scope.$watch('persons', scope.initTask);
            scope.$watch('persons.$resolved', scope.initTask);
            //scope.$watch('assignments.$resolved', scope.initTask);

        },
        templateUrl: 'views/directives/task-editor.html'
    };
}

function MetaSuggestionPersonFilter() {
    return function (input, task, assignment, mode) {
        
        var suggestedSex = assignment.meta['SuggestedSex'], 
                suggestedRole = assignment.meta['SuggestedRole'], 
                output = [], match;
        
        var isSexAccepted = function(relation) {
            return !suggestedSex || suggestedSex === relation.person.sex;
        };
        
        var isRoleAccepted = function(relation) {
            return !suggestedRole || relation.roles.indexOf(suggestedRole) >= 0;
        };
        
        var isUsedFor = function(relation, task, assignment) {
            var usage = relation.person.meta['UsedFor'], usageElement, i, usageArray, 
                    usedForTask, usedForAssignment, result = false;
            usageArray = (usage ? usage.split(',') : []);
            
            for(i=0;i<usageArray.length;i++) {
                usageElement = usageArray[i].split('.');
                if(usageElement.length === 2) {
                    usedForTask = usageElement[0];
                    usedForAssignment = usageElement[1];
                    if((usedForTask === '*' || usedForTask === task.type) &&
                            (usedForAssignment === '*' || usedForAssignment === assignment.type)) {
                        result = true;
                        break;
                    }
                }
            }
            return result;
        };
        
        angular.forEach(input, function (relation) {
            match = isSexAccepted(relation) && 
                    isRoleAccepted(relation) && 
                    isUsedFor(relation, task, assignment);
            if((mode === 'match-only' && match) ||
                    (mode === 'no-match-only' && !match)) {
                output.push(relation);
            }
        });
        return output;
    };
}

function LoadingIndicatorSvc() {
    'use strict';
    var loading = false;
    return {
        setLoading: function (value) {
            loading = value === true;
        },
        isLoading: function() {
            return loading;
        }
    };
}

angular.module('orderly.web', ['ngRoute', 'ngAnimate', 'orderly.services', 'ui.calendar', 'ui.bootstrap', 'pascalprecht.translate'])
    .config(AppConfig)
    .controller('LoginController', LoginController)
    .controller('NewPasswordController', NewPasswordController)
    .controller('ProfileController', ProfileController)
    .controller('PasswordController', PasswordController)
    .controller('AssignmentController', AssignmentController)
    .controller('MenuController', MenuController)
    .controller('CalendarController', CalendarController)
    .controller('AdminDomainListController', AdminDomainListController)
    .controller('AdminPersonListController', AdminPersonListController)
    .directive('relationList', RelationListDirective)
    .directive('personForm', PersonFormDirective)
    .directive('taskEditor', TaskEditorDirective)
    .directive('eventTable', EventTableDirective)
    .directive('eventCalendar', EventCalendarDirective)
    .filter('metaSuggestions', MetaSuggestionPersonFilter)
    .factory({
        'LoadingIndicatorSvc': LoadingIndicatorSvc
    })
    .run(function ($rootScope, $location, PersonSvc, $route, LoginSvc) {
        
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

        LoginSvc.authenticate().then(function () {
            $location.path('/calendar');
        }, function () {
            $location.path('/login');
        });

    });