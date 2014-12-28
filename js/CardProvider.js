/**
 * Copyright (C) 2014 Lenny Nilsson
 */

"use strict";

var CardProvider = function(_settings) {

    var settings = $.extend({
		subreddit: '',
		sorting: 'hot',
		limit: 50,
		timeout: 30 * 1000,
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

	function parseItem(item, item_id) {
		var data = item.data;
		var content_image = false;
		var content_text = false;
		var content_raw = false;
		var content_gif = false;
		var content_embed = false;
		var content_thumb = false;
		if (data.title && 0 < data.title.trim().length) {
			content_text = data.title;
		}
		if (beginsWith(data.url, 'http://m.imgur.com/a/')
			|| beginsWith(data.url, 'http://imgur.com/a/')
			|| beginsWith(data.url, 'http://imgur.com/gallery/')) {
			var id = getLastPart(data.url);
			content_embed = 'http://imgur.com/a/'+id+'/embed';
		} else if (beginsWith(data.url, 'http://www.gfycat.com/')) {
			var id = getLastPart(data.url);
			//zippy, fat, giant
			content_gif = 'http://zippy.gfycat.com/' + id + '.gif';
		} else if (data.source_url && beginsWith(data.source_url, 'http://www.gfycat.com/')) {
			var id = getLastPart(data.source_url);
			//zippy, fat, giant
			content_gif = 'http://zippy.gfycat.com/' + id + '.gif';
		} else if (beginsWith(data.url, 'http://imgur.com/')
				|| beginsWith(data.url, 'http://i.imgur.com/')
				|| beginsWith(data.url, 'http://31.media.tumblr.com/')){
			var id = getLastPart(data.url);
			if (endsWith(id, '.gif')) {
				content_gif = 'http://i.imgur.com/' + id;
			} else if (endsWith(id, '.gifv')) {
				content_gif = 'http://i.imgur.com/' + id.slice(0, -1);
			} else {
	    		content_image = 'http://i.imgur.com/' + id + '.jpg';
			}
		} else if (beginsWith(data.url, 'http://www.ted.com/talks/')) {
			var id = getLastPart(data.url);
			content_embed = 'https://embed-ssl.ted.com/talks/' + id + '.html';
		} else if (beginsWith(data.url, 'http://youtu.be/')) {
			var id = getLastPart(data.url);
			content_embed = 'http://www.youtube.com/embed/' + id;
		} else if (beginsWith(data.url, 'https://www.youtube.com/watch')
				|| beginsWith(data.url, 'http://www.youtube.com/watch')) {
			var id = getLastPart(data.url, 'v=');
			content_embed = 'http://www.youtube.com/embed/' + id;
		} else if (data.is_self && data.selftext != null && 0 < data.selftext.trim().length) {
	    	content_raw = markdown.toHTML(data.selftext);
		} else if (data.media 
				&& data.media.oembed 
				&& data.media.oembed.content) {
			content_raw = content;
		} else if (endsWith(data.url, '.gif')) {
			content_gif = data.url;
		} else if (data.thumbnail && 0 < data.thumbnail.length 
				&& data.thumbnail != 'default' 
				&& data.thumbnail != 'self' 
				&& data.thumbnail != 'nsfw') {
			content_image = data.thumbnail;
		} else if (content_text == false) {
			content_text = data.url;
		}
		
		if (data.thumbnail 
				&& 0 < data.thumbnail.length 
				&& data.thumbnail != 'default' 
				&& data.thumbnail != 'self' 
				&& data.thumbnail != 'nsfw') {
			content_thumb = data.thumbnail;	
		}
		
		return template({
			id: item_id,
			title: data.title,
			source: data.domain,
			source_url: data.url,
			content_text: content_text,
			content_image: content_image,
			content_gif: content_gif,
			content_raw: content_raw,
			content_embed: content_embed,
			content_thumb: content_thumb,
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
				if (status == 'success') {
					$elem.attr('src', src).removeAttr('data-src');
				}
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
				if (status == 'success') {
					$elem.attr('src', src).removeAttr('data-gif');
				}
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
			settings.onLoad(id, $card, available);
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