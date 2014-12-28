/**
 * Copyright (C) 2014 Lenny Nilsson
 */

"use strict";

var CardProvider = function(_settings) {

    var settings = _.extend({
		subreddit: '',
		sorting: 'hot',
		limit: 50,
		timeout: 5 * 1000,
		onBeforeLoad: function() {},
		onLoad: function(id, $card, available) {},
		onAfterLoad: function() {},
		onAvailable: function() {},
		onAllAvailable: function() {},
		onNoMore: function() {},
		onReset: function(subreddit, sorting) {}
    }, _settings);
	var template = null;
	var promise = null;
	var api = null;
	var lastCardId = -1;
	var firstAvailableId = -1;
	var availableIds = [];
	var self = this;
	var filters = [
		{
			on: /^https?:\/\/(?:i\.imgur|imgur|m\.imgur)\.com\/(?:a|gallery)\/(.*)/i,
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
			on: /^https?:\/\/www\.vimeo\.com\/(.*)/i,
			convert: function(content, url, match) {
				var id = match[1];
				content.content_embed = 'https://player.vimeo.com/video/' + id;
			} 
		},
		{
			on: /^https?:\/\/(?:i\.imgur|imgur|m\.imgur)\.com\/(.*)/i,
			convert: function(content, url, match) {
				var id = match[1];
				if (endsWith(id, '.gif')) {
					content.content_gif = 'http://i.imgur.com/' + id;
				} else if (endsWith(id, '.jpg')) {
					content.content_image = 'http://i.imgur.com/' + id;
				} else if (endsWith(id, '.gifv')) {
					content.content_gif = 'http://i.imgur.com/' + id.slice(0, -1);
				} else {
		    		content.content_image = 'http://i.imgur.com/' + id + '.jpg';
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
			on: /^https?:\/\/vine\.co\/(.*)/i,
			convert: function(content, url, match) {
				var id = match[1];
				content.content_embed = 'https://vine.co/v/' + id + '/embed/simple?audio=1';
			} 
		},
		{
			on: /^https?:\/\/(?:youtube\.com|youtube\.com\/watch|m\.youtube\.com\/watch|www\.youtube\.com\/watch)\/?\?(.*)/i,
			convert: function(content, url, match) {
				var query = getQueryParts(match[1]);
				//console.log(query);
				content.content_embed = 'http://www.youtube.com/embed/' + query.v;
			} 
		}
	];

	function init() {
		api = new Snoocore({ 
			userAgent: 'ReReR/0.3.1 by netcrawler',
			oauth: { 
			    type: 'web',
			    consumerKey: 'hBA0ehFp--9Xzw',
			    scope: ['flair', 'identity', 'read', 'report', 'save', 'subscribe', 'vote']
			}
		});
		template = Handlebars.compile($("#entry-template").html());
	}

	function reset(subreddit, sorting) {
		settings.subreddit = subreddit;
		settings.sorting = sorting;
		lastCardId = -1;
		firstAvailableId = -1;
		availableIds = [];
		if (subreddit == '') {
			promise = api('/'+settings.sorting).listing({ 
				limit: settings.limit 
			});
		} else {
			promise = api('/r/$subreddit/' + settings.sorting).listing({ 
				$subreddit: settings.subreddit, 
				limit: settings.limit 
			});
		}
		settings.onReset(subreddit, sorting);
		more();
	}

	function setAvailable(id) {
		availableIds.push(id);
		availableIds.sort(function(a, b) {
			return a - b;
		});
		var nextAvailableId = firstAvailableId;
		while(0 < availableIds.length && availableIds[0] == nextAvailableId + 1) {
			nextAvailableId = availableIds.shift();
		}
		if (firstAvailableId < nextAvailableId) {
			firstAvailableId = nextAvailableId;
			settings.onAvailable(firstAvailableId);
			if (firstAvailableId == lastCardId) {
				settings.onAllAvailable();
			}
		}
	}

	function getLastPart(string, sep) {
		if (sep == void 0) {
			sep = '/';
		}
		var parts = string.split(sep);
		return parts[parts.length - 1].split('#')[0];
	}

	function beginsWith(s1, s2) {
		return s1.indexOf(s2) == 0;
	}

	function endsWith(s1, s2) {
		return s1.substring(s1.length - s2.length, s1.length) === s2;
	}

	function exposeLinks(html) {
		return _.unescape(html).replace(/[\s\n]*(\/u\/([\w]+))[\s\n]*/mg, function() {
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
		});/*.replace(/(https?:\/\/[^\s<]{2,})/mi, function() {
			var full = arguments[0];
			var url = arguments[1];
			return '<a href="'+url+'" target="_blank">'+url+'</a>';
		});*/
	}

	function getQueryParts(query) {
		var parts = {};
		var vars = query.replace(/&amp;/g, '&').split('&');
		for (var i in vars) {
			var pair = vars[i].split('=');
			parts[pair[0]] = pair[1];
		}
		return parts;
	}

	function filterContent(url, content) {
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
	}

	function parseItem(item, item_id) {
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
			if (data.is_self && data.selftext != null && 0 < data.selftext.trim().length) {
				var html = markdown.toHTML(data.selftext);
				content.content_raw = html;
			} else if (data.media 
					&& data.media.oembed 
					&& data.media.oembed.content) {
				content.content_raw = content;
			} else if (endsWith(data.url, '.gif')) {
				content.content_gif = data.url;
			} else if (data.thumbnail && 0 < data.thumbnail.length 
					&& data.thumbnail != 'default' 
					&& data.thumbnail != 'self' 
					&& data.thumbnail != 'nsfw') {
				content.content_image = data.thumbnail;
			} else if (content.content_text == false) {
				content.content_text = data.url;
			}				
		}

		if (content.content_raw) {
			content.content_raw = exposeLinks(content.content_raw);
		}

		return template(_.extend(content, {
			id: item_id,
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
		}));		
	}

	function loadImage(src, cb) {
		var img = new Image();
		var timer = setTimeout(function() {
			img.onload = null;
			cb('fail', img);
		}, settings.timeout);
		img.onload = function() {
			clearTimeout(timer);
			cb('success', img);
		};
		img.src = src;
		return img;
	}

	function addHooks($card, id) {
		var available = true;
		$card.find('[data-subreddit]').on('click', function (e) {
			setLocation($(e.currentTarget).data('subreddit'));
		});
		$card.find('[data-embed]').one('click', function(e) {
			var $embed = $(e.currentTarget);
			var src = $embed.data('embed');
			var $elem = $('<iframe class="embed-responsive-item" src="'+src+'" frameborder="0" scrolling="no" wmode="Opaque" allowfullscreen />');
			$embed.removeAttr('data-embed').removeClass('placeholder').empty().append($elem);
		});
		$card.find('[data-src]').each(function() {
			var $elem = $(this);
			var src = $elem.data('src');
			var img = new Image();
			available = false;
			loadImage(src, function(status, img) {
				$elem.attr('src', src).removeAttr('data-src');
				setAvailable(id);
			});
		});
		$card.find('[data-gif]').one('click', function(e) {
			e.preventDefault();
			var event = e || window.event;
    		event.stopPropagation ? event.stopPropagation() : (event.cancelBubble=true);
			var $elem = $(e.currentTarget);
			var src = $elem.data('gif');
			loadImage(src, function(status, img) {
				$elem.attr('src', src).removeAttr('data-gif');
				settings.onAvailable(id);
			});
			return false;
		});
		$card.find('[data-fullscreen]').on('click', function(e) {
			e.preventDefault();
			$(e.currentTarget).closest('.list-group').toggleClass('fullscreen');
			return false;
		});
		return available;
	}

	function parse(data) {
		for (var i in data) {
			var item = data[i];
			lastCardId += 1;
			var id = lastCardId;
			var $card = $(parseItem(item, id));
			var available = addHooks($card, id);
			settings.onLoad(id, $card);
			if (available) {
				setAvailable(id);
			}
	    }
	}

	function more() {
		settings.onBeforeLoad();
		promise.then(function(slice) {
		    if (slice.empty) {
		    	settings.onAllAvailable();
		    	settings.onNoMore();
		    } else { 
				parse(slice.children);
				promise = slice.next();
		    	settings.onAfterLoad();
		    }
		    return promise;
		});
	}

	function count() {
		return lastCardId + 1;
	}

	return {
		init: init,
		reset: reset,
		count: count,
		more: more,
		api: function() { return api; }
	};
}