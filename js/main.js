"use strict";

var App = function() {
	var self = this;
	var subreddit = null;
	var sorting = null;
	var api = new Snoocore({ 
		userAgent: 'ReReR/0.2 by netcrawler',
	    oauth: { 
	        type: 'web',
	        consumerKey: 'hBA0ehFp--9Xzw',
	        scope: ['flair', 'identity', 'read', 'report', 'save', 'subscribe', 'vote']
	    }
	});
	var templates = {};
	var promise = null;
	var $container = $('#content');
	var $subreddit = $('#subreddit');
	var $load_more = $('#load_more');
	var columizer = null;
	var bloodhound = new Bloodhound({
	  datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
	  queryTokenizer: Bloodhound.tokenizers.whitespace,
	  remote: {
		  url: 'https://www.reddit.com/subreddits/search.json?limit=25&q=%QUERY',
		  rateLimitWait: 200,
		  filter: function(response) {
			  var matches = [];
			  var list = response.data.children;
			  for (var i in list) {
				  var item = list[i].data;
				  matches.push({ 
					  value: item.display_name,
					  description: item.title, 
					  url: item.url 
				  });
			  }
			  _.defer(function() {
				  var local = store.get('typeahead');
				  local = _.union(local, matches);
				  console.log(local);
				  store.set('typeahead', local);
			  });
			  return matches;
		  }
	  }
	});

	function updateUI() {
		$('#subreddit').val(subreddit);
		$('.navbar .nav li').removeClass('active');
		$('.nav a[data-sorting="'+sorting+'"]').parent().addClass('active');
	}
	
	function parseItem(item) {
    	var data = item.data;
    	var content_image = false;
    	var content_text = false;
    	var content_raw = false;
    	var content_embed = false;
    	var content_embed_thumb = false;
		if (data.title && 0 < data.title.trim().length) {
    		content_text = data.title;
		}
    	if (compare(data.url, 'http://m.imgur.com/a/')
			|| compare(data.url, 'http://imgur.com/a/')) {
    		var id = getLastPart(data.url);
    		content_embed = 'http://imgur.com/a/'+id+'/embed';
    	} else if (compare(data.url, 'http://www.gfycat.com/')) {
    		var id = getLastPart(data.url);
    		//zippy, fat, giant
    		content_image = 'http://zippy.gfycat.com/' + id + '.gif';
    		//content_embed = 'http://gfycat.com/ifr/' + id;
    	} else if (data.source_url && compare(data.source_url, 'http://www.gfycat.com/')) {
    		var id = getLastPart(data.source_url);
    		//zippy, fat, giant
    		content_image = 'http://zippy.gfycat.com/' + id + '.gif';
    		//content_embed = 'http://gfycat.com/ifr/' + id;
    	} else if (compare(data.url, 'http://imgur.com/')
    			|| compare(data.url, 'http://i.imgur.com/')
    			|| compare(data.url, 'http://31.media.tumblr.com/')){
    		var id = getLastPart(data.url);
    		if (endsWith(id, '.gif')) {
    			content_image = 'http://i.imgur.com/' + id;
    		} else if (endsWith(id, '.gifv')) {
    			content_image = 'http://i.imgur.com/' + id.slice(0, -1);
    		} else {
        		content_image = 'http://i.imgur.com/' + id + '.jpg';
    		}
    	} else if (compare(data.url, 'http://www.ted.com/talks/')) {
    		var id = getLastPart(data.url);
    		content_embed = 'https://embed-ssl.ted.com/talks/' + id + '.html';
    	} else if (compare(data.url, 'http://youtu.be/')) {
    		var id = getLastPart(data.url);
    		content_embed = 'http://www.youtube.com/embed/' + id;
    	} else if (compare(data.url, 'https://www.youtube.com/watch')
    			|| compare(data.url, 'http://www.youtube.com/watch')) {
    		var id = getLastPart(data.url, 'v=');
    		content_embed = 'http://www.youtube.com/embed/' + id;
    	} else if (data.is_self && data.selftext != null && 0 < data.selftext.trim().length) {
        	content_raw = markdown.toHTML(data.selftext); //.replace(/[\n]/gm, '<br>');
    	} else if (data.media 
    			&& data.media.oembed 
    			&& data.media.oembed.content) {
    		content_raw = content;
    	} else if (data.thumbnail && 0 < data.thumbnail.length 
    			&& data.thumbnail != 'default' 
    			&& data.thumbnail != 'self' 
    			&& data.thumbnail != 'nsfw') {
    		content_image = data.thumbnail;		
    	} else if (content_text == false) {
    		content_text = data.url;
    	}
    	
    	if (content_embed
    			&& data.thumbnail 
    			&& 0 < data.thumbnail.length 
    			&& data.thumbnail != 'default' 
    			&& data.thumbnail != 'self' 
    			&& data.thumbnail != 'nsfw') {
    		content_embed_thumb = data.thumbnail;	
    	}
    	
    	return templates.entry({
    		title: data.title,
    		source: data.domain,
    		source_url: data.url,
    		content_text: content_text,
    		content_image: content_image,
    		content_raw: content_raw,
    		content_embed: content_embed,
    		content_embed_thumb: content_embed_thumb,
    		nsfw: data.over_18,
    		has_raw: content_raw != false,
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
	
	function parse(slice) {
		var lazyLayout = _.debounce(columizer.layout, 300);
	    for (var s in slice) {
	    	var item = slice[s];
	    	var $html = $(parseItem(item));
			$html.find('[data-subreddit]').on('click', function (e) {
				setLocation($(e.currentTarget).data('subreddit'));
			});
			$html.find('[data-embed]').on('click', function(e) {
				var $embed = $(e.currentTarget);
				var src = $embed.data('embed');
				var $elem = $('<iframe class="embed-responsive-item" src="'+src+'" frameborder="0" scrolling="no" wmode="Opaque" allowfullscreen />');
				$embed.removeAttr('data-embed').removeClass('placeholder').empty().append($elem);
			});
			$html.css('opacity', 0);
		    $container.append($html);
		    imagesLoaded($container[0], lazyLayout);
	    }
	}
	
	function loadMore() {
		$load_more.button('loading');
		promise.then(function(slice) {
		    parse(slice.children);
		    promise = slice.next();
		    // Reset load button when all is loaded
		    imagesLoaded($container[0], function() {
				$load_more.button('reset');
		    });
		    return promise;
		});
	}
	
	function setLocation(_subreddit, _sorting, _title) {	
		var changed = sorting != _sorting && subreddit != _subreddit;
		if (_.isEmpty(_subreddit)) {
			_subreddit = '';
		}
		if (_.isEmpty(_sorting)) {
			_sorting = 'hot';
		}
		if (changed) {
			if (!_.isEmpty(_title)) {
				document.title = _title;
			}
			subreddit = _subreddit;
			sorting = _sorting;
			$container.empty();
			columizer.reset();
			if (subreddit == '') {
				promise = api('/'+sorting).listing({ 
					limit: 50 
				});
			} else {
				promise = api('/r/$subreddit/' + sorting).listing({ 
					$subreddit: subreddit, 
					limit: 50 
				});	
			}		
			updateUI();
			setPath();
			loadMore();	
		}
	}

	function toggleNSFW() {
		var isAdult = store.get('adult');
		var $body = $('body');
		var $toggle = $('#nsfw_toggle');
		var setNSFW = function() {
			$body.removeClass('sfw');
			$toggle.addClass('active');
			store.set('adult', true);
		}
		if ($body.hasClass('sfw')) {
			if (isAdult) {
				setNSFW();
			} else {
				$('#ans_yes').one('click', setNSFW);
				$('#confirm_modal').modal('show');
			}
			
		} else {
			$body.addClass('sfw');
			$toggle.addClass('active');
		}		
	}
	
	function getForm(form) {
	    var formObj = {};
	    var inputs = $(form).serializeArray();
	    $.each(inputs, function (i, input) {
	        formObj[input.name] = input.value;
	    });
	    return formObj;
	}

	function compare(s1, s2) {
		return s1.indexOf(s2) == 0;
	}

	function getLastPart(string, sep) {
		if (sep == void 0) {
			sep = '/';
		}
		var parts = string.split(sep);
		return parts[parts.length - 1].split('#')[0];
	}

	function setPath() {
		var hash = '#' + ((0 < subreddit.length) ? '/r/' + subreddit : '') + '/' + sorting;
		if(history.pushState) {
		    history.pushState(null, null, hash);
		} else {
		    location.hash = hash;
		}
	}

	function endsWith(str, end) {
		return str.substring( str.length - end.length, str.length ) === end;
	}

	function changeTypeahead($e, datum) {
		var _subreddit = datum.url.slice(3, datum.url.length-1);
		var _title = datum.description;
		$subreddit.typeahead('val', _subreddit);
		setLocation(_subreddit, null, _title);
	}
	
	function initLocation() {
		var _subreddit = '';
		var _sorting = 'hot';
		var _title = 'RedditReadR';
		if(window.location.hash) {
			var parts = window.location.hash.split('/');
			if (3 <= parts.length) {
				_subreddit = parts[2];
			} 
			if (4 == parts.length) {
				_sorting = parts[3];
			}
		}
		setLocation(_subreddit, _sorting, _title);
	}
	
	function initHooks() {
		$('#load_more').on('click', loadMore);		
		$('#nsfw_toggle').on('click', toggleNSFW);
		$('[data-sorting]').on('click', function(e) {
			e.preventDefault();
			var _sorting = $(e.currentTarget).data('sorting');
			setLocation(null, _sorting);
			return false;
		});
		if (store.get('disclaimer')) {
			$('#disclaimer').remove();
		} else {
			$('#disclaimer').on('closed.bs.alert', function () {
				store.set('disclaimer', true);
			});			
		}
	}

	function initTypeahead() {
		var cached_data = store.get('typeahead');
		if (_.isEmpty(cached_data)) {
			cached_data = [];
		}
		bloodhound.initialize();
		var locals = new Bloodhound({
		  datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
		  queryTokenizer: Bloodhound.tokenizers.whitespace,
		  local: cached_data
		});
		$subreddit.typeahead({
			  hint: true,
			  highlight: true,
			  minLength: 1
			}, 
			{
			  name: 'cached-subreddits',
			  templates: {
				  header: 'Cached'
			  },
			  displayKey: 'value',
			  source: locals.ttAdapter()
			},
			{
			  name: 'subreddits',
			  templates: {
				  header: 'Fetched'
			  },
			  displayKey: 'value',
			  source: bloodhound.ttAdapter()
			}
		).bind('typeahead:selected', function($e, datum) {
	        changeTypeahead($e, datum);
	    }).bind('typeahead:autocompleted', function($e, datum) {
	        changeTypeahead($e, datum);
	    });
	}
	
	function init() {
		templates.entry = Handlebars.compile($("#entry-template").html());
		columizer = new Columizer();
		columizer.init();
		initLocation();
		initHooks();
		initTypeahead();
	}
	
	return {
		init: init
	};
};

var app = new App();

$(function() {
	app.init();
});