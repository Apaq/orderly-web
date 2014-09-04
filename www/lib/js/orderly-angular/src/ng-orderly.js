function OrderlyProvider() {
    'use strict';
    /* SERVICEURL START */
    var serviceUrl = "http://192.168.87.104:8084/";
    /* SERVICEURL END */

    this.setServiceUrl = function (url) {
        serviceUrl = url;
    };

    this.convertDateStringsToDates = function (keys, data) {
        var key, value, i;
        for (key in data) {
            if (data.hasOwnProperty(key)) {
                if (keys.indexOf(key) >= 0 && angular.isString(data[key])) {
                    value = Date.parse(data[key]); // try to parse to date
                    if (value !== NaN) {
                        data[key] = new Date(value);
                    }
                }

                if (angular.isObject(data[key])) {
                    this.convertDateStringsToDates(keys, data[key]);
                }

                if (angular.isArray(data[key])) {
                    for (i = 0; i < data[key].length; i++) {
                        this.convertDateStringsToDates(keys, data[key][i]);
                    }
                }
            }
        }
    };

    this.$get = function () {
        return {
            getServiceUrl: function () {
                return serviceUrl;
            },
            setServiceUrl: function (url) {
                serviceUrl = url;
            }
        };
    };


}

function Config($httpProvider, orderlyProvider) {
    $httpProvider.defaults.transformResponse.push(function (responseData) {
        orderlyProvider.convertDateStringsToDates(['startTime', 'endTime'], responseData);
        return responseData;
    });
}

function SystemSvc($http, orderly, $q) {
    return {
        checkUsernameAvailable: function (username) {
            return $http.get(orderly.getServiceUrl() + 'system/usernames/' + username).
            success(function () {
                return false;
            }).
            error(function (data, status) {
                if(status === 404) {
                    return true;
                } else {
                    return $q.reject("Server did not respond as expected. Status: " + status);
                }
            });
        },
        changePassword: function(oldPassword, newPassword) {
            var data = {
                oldPassword: oldPassword,
                newPassword: newPassword
            };
            return $http.put(orderly.getServiceUrl() + 'system/password', data);
        },
        regeneratePassword: function(emailAddress, securityQuestionType, securityQuestionAnswer) {
            return $http.post(orderly.getServiceUrl() + 'system/password', 
                             {emailAddress: emailAddress, 
                              securityQuestionType: securityQuestionType, 
                              securityQuestionAnswer:securityQuestionAnswer}).then(function(response) {
                if(response.status >= 400) {
                    throw response.data.message;
                }
                return;
            });
        },
        getSecurityQuestionType: function(emailAddress) {
            return $http.get(orderly.getServiceUrl() + 'system/securityQuestions/' + escape(emailAddress) + '/type').then(function(response) {
                if(response.status >= 400) {
                    throw "Mail Address is not registered";
                }
                return angular.fromJson(response.data);
            });
        },
        changeUserRole: function(userId, newRole) {
            return $http.post(orderly.getServiceUrl() + 'system/users/' + userId + '/role', newRole);
        },
        setUserEnabled: function(userId, value) {
            value = value === true;
            return $http.post(orderly.getServiceUrl() + 'system/users/' + userId + '/enabled', value);
        }
    };
}

function PersonSvc($resource, orderly) {
    return $resource(orderly.getServiceUrl() + 'persons/:id', null, {
        'relations': {
            method: 'GET',
            url: orderly.getServiceUrl() + 'persons/:id/relations',
            isArray: true
        }
    });
}

function AssignmentSvc($resource, orderly) {
    return $resource(orderly.getServiceUrl() + 'persons/:pid/assignments/:id');
}

function EventSvc($resource, orderly) {
    return $resource(orderly.getServiceUrl() + 'events/:id', null, {
        'update': {
            method: 'PUT'
        }
    });
}

function DomainSvc($resource, orderly) {
    return $resource(orderly.getServiceUrl() + 'domains/:id');
}

function RelationSvc($resource, orderly) {
    return $resource(orderly.getServiceUrl() + 'domains/:domain/relations/:id');
}

function LoginSvc($q, localStorageService, $http, $rootScope, orderly, $log) {
    'use strict';
    var currentUser = null;
    return {
        authenticate: function (username, password, remember) {

            var user = null,
                authHeader, token;

            if (!username && !password) {
                token = localStorageService.get('LoginToken');
            } else if (username && password) {
                token = btoa(username + ':' + password);
            }

            if (token) {
                authHeader = 'Basic ' + token;
                return $http.get(orderly.getServiceUrl() + "persons/current", {
                    headers: {
                        'Authorization': authHeader
                    }
                }).then(function (response) {

                    if (response.status !== 200) {
                        var reason = response.data;
                        if (!reason || '' === reason) {
                            reason = 'Unable to communicate with server';
                        }
                        localStorageService.remove('LoginToken');
                        console.info('Unable to authenticate: ' + reason.message);
                        return $q.reject('Unable to authenticate. Reason: ' + reason.message);
                    }

                    if (remember) {
                        localStorageService.add('LoginToken', token);
                    }

                    $rootScope.credentials = {
                        username: username,
                        password: password
                    };
                    user = response.data;

                    $log.info('Authenticated. Returning user.');
                    $http.defaults.headers.common.Authorization = authHeader;

                    $log.info('Logged in as ' + user.username);
                    currentUser = user;
                    $rootScope.currentUser = user;
                    $rootScope.$broadcast("login", user);
                    return user;
                });
            } else {
                console.info('Unable to authenticate.');
                return $q.reject('No credentials specified or available for authentication.');
            }

        },
        getCurrentUser: function () {
            return currentUser;
        },
        deauthenticate: function () {
            $http.defaults.headers.common.Authorization = undefined;
            localStorageService.remove('LoginToken');
            $rootScope.$broadcast("logout", currentUser);
            currentUser = null;
            $rootScope.currentUser = null;
        }
    };
}


angular.module('orderly.services', ['ngResource', 'LocalStorageModule'])
    .provider('orderly', OrderlyProvider)
    .config(Config)
    .factory({
        'PersonSvc': PersonSvc,
        'AssignmentSvc': AssignmentSvc,
        'EventSvc': EventSvc,
        'LoginSvc': LoginSvc,
        'RelationSvc': RelationSvc,
        'DomainSvc': DomainSvc,
        'SystemSvc': SystemSvc
    });