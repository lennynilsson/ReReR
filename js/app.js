/**
 * License: Creative Commons Attribution-ShareAlike 4.0 International
 */

"use strict";

var app = angular.module('app', [
                                 'ngResource',
                                 'ngRoute',
                                 'ui.bootstrap'
                                 ]);

/**
 * Enable cross-origin resource sharing
 */
app.config(['$httpProvider', '$sceProvider', 
            function ($httpProvider, $sceProvider) {
	$httpProvider.defaults.useXDomain = true;
	delete $httpProvider.defaults.headers.common['X-Requested-With'];
	$sceProvider.enabled(false);
}]);

/**
 * Setup routing
 */
app.config(['$routeProvider', '$locationProvider',
            function($routeProvider, $locationProvider) {
	$routeProvider.
	when('/r/:subreddit/:sorting', {
		templateUrl: 'partials/main.html',
		controller: 'MainController'
	}).
	when('/:sorting', {
		templateUrl: 'partials/main.html',
		controller: 'MainController'
	}).
	otherwise({
		redirectTo: '/hot'
	});
}]);

/**
 * Directive to bind key events
 */
app.directive('ngKey', ['$parse', function($parse) {
    var keyCodes = {
        8: 'backspace',
        9: 'tab',
        13: 'enter',
        27: 'esc',
        32: 'space',
        33: 'pageup',
        34: 'pagedown',
        35: 'end',
        36: 'home',
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
        45: 'insert',
        46: 'delete'
    };
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            var getter = $parse(attrs.ngKey);
            if (!getter) {
                return;
            }
            var map = getter(scope);
            if (!map) {
                return;
            }
            var key = event.which;
            var action = map[keyCodes[key]] || map[key];
            if (!action) {
                return;
            }
            scope.$eval(action);
            event.preventDefault();
        });
    };
}]);

/**
 * Directive to layout cards like Pinterest
 */
app.directive('ngContainer', function ($window, debounce, onLoaded) {
    return function (scope, element, attrs) {
        var _window = angular.element($window);
        var _container = element;
        var items = null;
    	var width = 0;
    	var columnSize = 480;
		var gutterSize = 15;
    	var columnWidth = 0;
    	var columnCount = 3;
    	var columns = [];
    	var offsets = [];
        var preloadPivotal = $window.innerHeight;

    	var reset = function() {
            var style = _container[0].currentStyle || window.getComputedStyle(_container[0]);
            width = parseInt(style.width);
    		columnCount = Math.floor((width + gutterSize) / (columnSize + gutterSize));
    		columnWidth = (width - (gutterSize * (columnCount - 1))) / columnCount;
    		columns = [];
    		offsets = [];
    		for (var c = 0; c < columnCount; c++) {
    			columns[c] = 0;
    			offsets[c] = c * columnWidth + c * gutterSize;
    		}
    	};

        var triggerPreload = debounce(function() {
            var breakPoint = Math.min.apply(Math, columns);
            var viewPortHeight = $window.innerHeight;
            var viewPortOffset = $window.pageYOffset;
            if (breakPoint < viewPortHeight + viewPortOffset + preloadPivotal) {
                scope.$evalAsync(attrs.ngPreload);
            }
        }, 1000);
    	
    	var layout = function(event) {
            _container[0].style.webkitTransform = _container[0].style.webkitTransform
            var children = _container.children();
            if (children.length < items.length) {
                return;
            }
    		reset();
    		for (var i = 0; i < items.length; i++) {
                var item = children[i];
                var _item = angular.element(item);
                var style = item.currentStyle || window.getComputedStyle(item, null);
    			var itemHeight = parseInt(style.height);
    			var column = 0;
    			var top = columns[column];
    			for (var c = 1; c < columnCount; c++) {
    				if (columns[c] < top) {
    					column = c;
    					top = columns[column];
    				}
    			}
    			columns[column] = columns[column] + gutterSize + itemHeight;
                if (!item.history) {
                    item.history = [];
                }
                item.history.push({"height" : itemHeight, "top" : top});
                _item.css({
                    top : top + 'px',
                    left : offsets[column] + 'px',
                    width : columnWidth + 'px',
                    position : 'absolute',
                    opacity : 1.0
                });
                var data = items[i];
                if (data.content_gif) {
                    onLoaded(data.content_gif, scope.layout);
                }
                if (data.content_image) {
                    onLoaded(data.content_image, scope.layout);
                }
    		}
            _container.css({
                position: 'relative',
                'height': Math.max.apply(Math, columns) + 'px'
            });
            if(event && 'DOMSubtreeModified' == event.type) {
                // Run a second pass if there are new items
                scope.layout();
            }
            return false;
    	};
    	
    	scope.$watch(attrs.ngContainer, function(attr) {
    		items = attr;
		});

        scope.layout = debounce(layout);

        _window.on('DOMContentLoaded DOMSubtreeModified propertychange load resize scroll', scope.layout);
        _window.on('scroll', triggerPreload);
    }
});

/**
 * Determine if an image is loaded
 */
app.factory('onLoaded', ['$rootScope', function($rootScope) {
    return function(src, callback) {
        var image = new Image();
        if (!image.complete) {
            var prepared = function() {
                image.onload = void 0;
                image.onerror = void 0;
                callback(src);
                $rootScope.$digest();
            };
            image.onload = prepared;
            image.onerror = prepared;
            image.src = src;
        }
    };
}]);

/**
 * Debounce events
 */
app.factory('debounce', function($timeout) {
    return function(callback, _interval) {
        var timeout = null;
        var interval = _interval || 400;
        return function() {
            var args = arguments;
            $timeout.cancel(timeout);
            timeout = $timeout(function () {
                callback.apply(this, args);
            }, interval);
        };
    };
});

/**
 * Parse page responses from Reddit
 */
app.factory('ResponseParser', function() {
    var getQueryParts = function(query) {
        var parts = {};
        var vars = query.replace(/&amp;/g, '&').split('&');
        for (var i in vars) {
            var pair = vars[i].split('=');
            parts[pair[0]] = pair[1];
        }
        return parts;
    };
    var endsWith = function(str, end) {
        return str.substring( str.length - end.length, str.length ) === end;
    };
    var exposeLinks = function(html) {
        return unescape(html).replace(/[\s\n]*(\/u\/([\w]+))[\s\n]*/mg, function() {
            var full = arguments[0];
            var match = arguments[1];
            var user = arguments[2];
            var replacement = '<a href="http://www.reddit.com/user/'+user+'" target="_blank">&#47;u&#47;'+user+'</a>';
            return full.replace(match, replacement);
        }).replace(/[\s]*(\/r\/([\w]+))[\s]*/mg, function() {
            var full = arguments[0];
            var match = arguments[1];
            var subreddit = arguments[2];
            var replacement = '<a href="http://reddit.com/r/'+subreddit+'" target="_blank">&#47;r&#47;'+subreddit+'</a>';
            return full.replace(match, replacement);
        });
    };
    var filters = [
        {
            on: /^https?:\/\/(?:imgur|m\.imgur)\.com\/(?:a|gallery)\/(.*)/i,
            convert: function(content, url, match) {
                var id = match[1];
                content.content_embed = 'http://imgur.com/a/'+id+'/embed';
            }
        },
        {
            on: /^https?:\/\/www\.gfycat\.com\/\/(.*)/i,
            convert: function(content, url, match) {
                var id = match[1];
                //zippy, fat, giant
                content.content_gif = 'http://zippy.gfycat.com/' + id + '.gif';
            }
        },
        {
            on: /^https?:\/\/www\.tedtalks\.com\/talks\/(.*)/i,
            convert: function(content, url, match) {
                var id = match[1];
                content.content_embed = 'https://embed-ssl.ted.com/talks/' + id + '.html';
            }
        },
        {
            on: /^https?:\/\/(?:www\.vimeo|vimeo)\.com\/(.*)/i,
            convert: function(content, url, match) {
                var id = match[1];
                content.content_embed = 'https://player.vimeo.com/video/' + id;
            }
        },
        {
            on: /^https?:\/\/(?:i\.imgur|imgur|m\.imgur)\.com\/(.*)(?:#[0-9]*)?/i,
            convert: function(content, url, match) {
                var id = match[1].split(',');
                if (1 < id.length) {
                    content.content_images = [];
                    for (var i = 0; i < id.length; i++) {
                        content.content_images.push({image_part: id[i]});
                    };
                } else {
                    id = id[0];
                    if (endsWith(id, '.gif')) {
                        content.content_gif = 'http://i.imgur.com/' + id;
                    } else if (endsWith(id, '.jpg') || endsWith(id, '.png')) {
                        content.content_image = 'http://i.imgur.com/' + id;
                    } else if (endsWith(id, '.gifv')) {
                        content.content_embed = 'http://i.imgur.com/' + id + '#embed';
                    } else {
                        content.content_image = 'http://i.imgur.com/' + id + '.jpg';
                    }
                }
            }
        },
        {
            on: /^https?:\/\/youtu\.be\/(.*)/i,
            convert: function(content, url, match) {
                var id = match[1];
                content.content_embed = 'http://www.youtube.com/embed/' + id;
            }
        },
        {
			on: /^https?:\/\/(?:www.|m.|)youtube\.com(?:\/watch|)\/?\?(?:v=|)(.*)/i,
			convert: function(content, url, match) {
				var id = match[1];
				content.content_embed = 'http://www.youtube.com/embed/' + id;
			}
        },
        {
            on: /^https?:\/\/vine\.co\/(?:v\/)(.*)/i,
            convert: function(content, url, match) {
                var id = match[1];
                content.content_embed = 'https://vine.co/v/' + id + '/embed/simple?audio=1';
            }
        }
    ];

    var filterContent =	function (url, content) {
        var matched = false;
        for (var i in filters) {
            var filter = filters[i];
            var match = url.match(filter.on);
            if (match != null) {
                filter.convert(content, url, match);
                matched = true;
                break;
            }
        }
        return matched;
    };

    var parseItem = function (item) {
        var data = item.data;
        var content = {
            content_text: false,
            content_image: false,
            content_gif: false,
            content_raw: false,
            content_embed: false,
            content_thumb: false
        };
        if (data.title && 0 < data.title.trim().length) {
            content.content_text = data.title;
        }
        if (data.thumbnail
            && 0 < data.thumbnail.length
            && data.thumbnail != 'default'
            && data.thumbnail != 'self'
            && data.thumbnail != 'nsfw') {
            content.content_thumb = data.thumbnail;
        }
        var url = data.url || data.source_url;

        var matched = filterContent(url, content);

        // Populate with fallback methods
        if (!matched) {
            ga('send', 'event', 'filterFallThrough', url);
            if (data.is_self && data.selftext != null && 0 < data.selftext.trim().length) {
                var html = markdown.toHTML(data.selftext);
                content.content_raw = html;
            } else if (data.media
                && data.media.oembed
                && data.media.oembed.content) {
                content.content_raw = data.media.oembed.content;
            } else if (endsWith(data.url, '.gif')) {
                content.show = true;
                content.content_gif = data.url;
            } else if (endsWith(data.url, '.jpg')
                || endsWith(data.url, '.jpeg')) {
                content.show = true;
                content.content_image = data.url;
            } else if (data.thumbnail && 0 < data.thumbnail.length
                && data.thumbnail != 'default'
                && data.thumbnail != 'self'
                && data.thumbnail != 'nsfw') {
                content.content_thumb = data.thumbnail;
            } else if (content.content_text == false) {
                content.content_text = data.url;
            }
        }

        if (content.content_raw) {
            content.content_raw = exposeLinks(content.content_raw);
        }

        angular.extend(content, {
            id: data.id,
            title: data.title,
            source: data.domain,
            source_url: url,
            nsfw: data.over_18,
            rating: data.score,
            num_comments: data.num_comments,
            comments_url: 'http://reddit.com' + data.permalink,
            author: data.author,
            author_url: 'http://www.reddit.com/user/' + data.author,
            subreddit: data.subreddit,
            subreddit_path: '/r/' + data.subreddit,
            subreddit_url: 'http://reddit.com/r/' + data.subreddit
        });

        return content;
    };

    return {
        parse: parseItem
    };
});

/**
 * Fetch posts Reddit
 */
app.factory('Reddit', ['$resource', '$routeParams', 'ResponseParser',
    function($resource, $routeParams, ResponseParser) {
    return {
        getListing: function(subreddit, sorting) {
            var index = 0;
            var state = {
                after: null,
                limit: 50,
                count: 0
            };
            return $resource('https://www.reddit.com/:r/:subreddit/:sorting.json', state, {
                getPage: {
                    method:'GET',
                    cache: true,
                    isArray: true,
                    transformResponse: function(data, headersGetter) {
                        var response = angular.fromJson(data);
                        var list = response.data.children;
                        var page = null;
                        if (0 < list.length) {
                            page = [];
                            state.after = list[list.length - 1].data.name;
                            state.count = state.count + state.limit;
                            for (var i in list) {
                                page.push(ResponseParser.parse(list[i]));
                            }
                            index += 1;
                            ga('send', 'event', 'loadMore', index);
                        }
                        return page;
                    },
                    params: {
                        sorting: function() {
                            return $routeParams.sorting;
                        },
                        r: function() {
                            return $routeParams.subreddit ? 'r' : null;
                        },
                        subreddit: function() {
                            return $routeParams.subreddit;
                        }
                    }
                }
            });
        }
    }
}]);

/**
 * Suggest subreddits
 */
app.factory('Suggestion', ['$resource', '$routeParams',
                           function($resource, $routeParams) {
    	return $resource('https://www.reddit.com/subreddits/search.json', {
    		limit: 30
    	}, {
    		suggest: {
    			method:'GET',
    			cache: true,
    			isArray: true,
    			transformResponse: function(data, headersGetter) {
    				var response = angular.fromJson(data);
    				var list = response.data.children;
    				var suggestions = [];
    				for (var i in list) {
    					var item = list[i].data;
    					suggestions.push({
    						label: item.title,
    						name: item.display_name,
    						nsfw: item.over18,
    						rating: item.subscribers
    					});
    				}
    				/*
    				suggestions.sort(function(a, b) {
    					return b.rating - a.rating;
					});
					*/
    				return suggestions;
    			}	
    		}
    	});
    }]);

app.controller('MainController', ['$scope', '$rootScope', '$routeParams', '$location', 'debounce',
                                  function ($scope, $rootScope, $routeParams, $location, debounce) {

    $rootScope.subreddit = $routeParams.subreddit;
    $rootScope.sorting = $routeParams.sorting;

	$scope.sfw = true;
	$scope.showDisclaimer = true;

	$scope.toggleSafeForWork = function() {
		$scope.sfw = !$scope.sfw;
        ga('send', 'event', 'nsfw', !$scope.sfw);
	};

    $scope.setSorting = function(sorting) {
        var path = null;
        if ($routeParams.subreddit && '' != $routeParams.subreddit) {
            path = '/r/' + $routeParams.subreddit + '/' + sorting;
        } else {
            path = '/' + sorting;
        }
        $rootScope.sorting = $routeParams.sorting = sorting;
        $location.path(path);
	};

    $scope.setSubreddit = function(subreddit) {
        var path = null;
        if (subreddit && '' != subreddit) {
            path = '/r/' + subreddit + '/' + $rootScope.sorting;
        } else {
            path = '/' + $rootScope.sorting;
        }
        $rootScope.subreddit = $routeParams.subreddit = subreddit;
        document.activeElement.blur();
        $location.path(path);
    };
}]);

app.controller('SuggestController', ['$scope', '$rootScope', '$routeParams', 'Suggestion', 'debounce',
            function ($scope, $rootScope, $routeParams, Suggestion, debounce) {

    var reset = function () {
        $scope.placeholder = $routeParams.subreddit || 'Subreddit';
        $scope.textField = $scope.placeholder;
        $scope.typedValue = void 0;
        $scope.highlighted = void 0;
        $scope.highlightedIndex = -1;
    };

    reset();

    $rootScope.$on('$routeChangeSuccess', reset);

    $scope.setActive = function(suggestion) {
        if (!$scope.typedValue) {
            $scope.typedValue = $scope.textField;
        }
        $scope.highlighted = suggestion;
        $scope.textField = suggestion.name;
        for (var i = 0; i < $scope.suggestions.length; i++) {
            var current = $scope.suggestions[i];
            $scope.suggestions[i].highlighted = current === suggestion;
            if (current.highlighted) {
                $scope.highlightedIndex = i;
            }
        }
    };
    $scope.changeActive = function(nextOffset) {
        $scope.highlightedIndex = nextOffset % $scope.suggestions.length;
        if ($scope.highlightedIndex < 0) {
            $scope.textField = $scope.typedValue;
            $scope.highlightedIndex = -1;
            if ($scope.highlighted) {
                $scope.highlighted.highlighted = void 0;
                $scope.highlighted = void 0;
            }
        } else {
            $scope.setActive($scope.suggestions[$scope.highlightedIndex]);
        }
        $scope.$digest();
    };
    $scope.set = function() {
        $scope.textField = void 0;
    };
    $scope.reset = function() {
        $scope.textField = $scope.placeholder;
        $scope.suggestions = null;
        $scope.highlighted = void 0;
        $scope.highlightedIndex = -1;
        document.activeElement.blur();
    };
    $scope.suggest = debounce(function() {
        if ($scope.textField.length < 3) return;
        $scope.typedValue = $scope.textField;
        $scope.highlighted = void 0;
        $scope.highlightedIndex = -1;
        ga('send', 'event', 'suggest', $scope.textField);
        Suggestion.suggest({
            q: $scope.textField
        }, function(suggestions) {
            $scope.suggestions = suggestions;
        }, function(error) {
            console.log(error);
        });
    }, 400);
}]);

app.controller('ListController', ['$scope', '$rootScope', '$routeParams', 'Reddit',
                                  function($scope, $rootScope, $routeParams, Reddit) {
	$scope.loading = false;
	$scope.cards = [];
    $scope.endOfList = false;
    $scope.listing = Reddit.getListing($rootScope.subreddit, $rootScope.sorting);
    $rootScope.$on('$routeChangeSuccess', function(event, $nextRoute, $lastRoute) {
        ga('send', 'pageview', {
            page: window.location.hash
        });
        $scope.loading = false;
        $scope.endOfList = false;
        $scope.cards = [];
        $scope.listing = Reddit.getListing($rootScope.subreddit, $rootScope.sorting);
        $scope.loadMore();
    });
	$scope.loadMore = function() {
        if (!$scope.loading && !$scope.endOfList) {
            $scope.loading = true;
            $scope.listing.getPage(function(page) {
                if (page) {
                    $scope.cards = $scope.cards.concat(page);
                    $scope.loading = false;
                    ga('send', 'pageview', {
                        page: window.location.hash + '#' + page
                    });
                } else {
                    $scope.endOfList = true;
                }
            }, function(error) {
                console.log(error);
                $scope.loading = false;
            });
        }
		return false;
	};
	$scope.open = function(location) {
        ga('send', 'event', 'open', location);
		window.open(location, '_blank');
		return false;
	};
	$scope.showInLightBox = function(card) {
        $rootScope.$emit('lightbox:show', card);
        return false;
    };
	$scope.loadMore();
}]);

app.controller('LightBoxController', ['$scope', '$rootScope',
                                  function($scope, $rootScope) {
	$scope.lightBoxShown = false;
	$scope.card = null;
    $scope.closeLightBox = function() {
        $scope.lightBoxShown = false;
        $scope.card = null;
        return false;
    };
    $rootScope.$on('lightbox:show', function(event, card) {
        ga('send', 'lightbox', card.comments_url);
        $scope.card = card;
        $scope.lightBoxShown = true;
    });
}]);

app.controller('MenuController', ['$scope', '$rootScope',
                                  function($scope, $rootScope) {
	$scope.collapsed = true;
    $scope.toggleMenu = function() {
        $scope.collapsed = !$scope.collapsed;
        ga('send', 'event', 'toggleMenu');
        return false;
    };
}]);


