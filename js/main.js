"use strict";

window.getForm = function(form) {
    var formObj = {};
    var inputs = $(form).serializeArray();
    $.each(inputs, function (i, input) {
        formObj[input.name] = input.value;
    });
    return formObj;
}

window.compare = function(s1, s2) {
	return s1.indexOf(s2) == 0;
}

window.getLastPart = function(string, sep) {
	if (sep == void 0) {
		sep = '/';
	}
	var parts = string.split(sep);
	return parts[parts.length - 1].split('#')[0];
}

window.setPath = function() {
	var hash = '#' + ((0 < window.subreddit.length) ? '/r/' + window.subreddit : '') + '/' + window.sorting;
	if(history.pushState) {
	    history.pushState(null, null, hash);
	} else {
	    location.hash = hash;
	}
}

window.endsWith = function(str, end) {
	return str.substring( str.length - end.length, str.length ) === end;
}

window.parse = function(slice) {
    var html = '';
    for (var s in slice) {
    	var data = slice[s].data;
    	var content_image = false;
    	var content_video = false;
    	var content_text = false;
    	var content_raw = false;
    	var content_embed = false;
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
    		content_video = 'https://embed-ssl.ted.com/talks/' + id + '.html';
    	} else if (compare(data.url, 'http://youtu.be/')) {
    		var id = getLastPart(data.url);
    		content_video = 'http://www.youtube.com/embed/' + id;
    	} else if (compare(data.url, 'https://www.youtube.com/watch')
    			|| compare(data.url, 'http://www.youtube.com/watch')) {
    		var id = getLastPart(data.url, 'v=');
    		content_video = 'http://www.youtube.com/embed/' + id;
    	} else if (data.is_self && data.selftext != null && 0 < data.selftext.trim().length) {
        	content_raw = '<p>' + data.selftext.replace(/[\n]/gm, '<br>') + '</p>';
    	} else if (data.media 
    			&& data.media.oembed 
    			&& data.media.oembed.content) {
    		content_raw = content;
    	} else if (data.thumbnail && 0 < data.thumbnail.length 
    			&& data.thumbnail != 'default' 
    			&& data.thumbnail != 'self') {
    		content_image = data.thumbnail;		
    	} else if (content_text == false) {
    		console.log(data);
    		content_text = data.url;
    	}
    	html += window.templates.entry({
    		title: data.title,
    		source: data.domain,
    		source_url: data.url,
    		content_video: content_video,
    		content_text: content_text,
    		content_image: content_image,
    		content_raw: content_raw,
    		content_embed: content_embed,
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
	return html;
}

window.reddit = new Snoocore({ 
	userAgent: 'ReReR/0.1 by netcrawler',
    oauth: { 
        type: 'web',
        consumerKey: 'hBA0ehFp--9Xzw',
        scope: [ 'flair', 'identity', 'read', 'report', 'save', 'subscribe', 'vote']
    }
});

window.load_more = function() {
	var button = $('#load_more');
	button.button('loading');
	window.promise.then(function(slice) {
	    button.button('reset');
	    var $html = $(window.parse(slice.children));
	    var $container = $('#content');
		$html.find('*[data-subreddit]').on('click', function (e) {
			var $target = $(e.currentTarget);
			var subreddit = $target.data('subreddit');
			$('#subreddit').val(subreddit);
			window.subreddit = subreddit;
			window.setPath();
			$('#content .item').remove(); // Remove old posts
			window.load_more();
		});
	    $container.append($html);
	    window.promise = slice.next();
	    return window.promise;
	});
}

window.changeTypeahead = function($e, datum) {
	document.title = datum.description;
	window.location.hash = datum.url;
	$('#content').find('.item').remove();
	console.log(datum.url.split('/')[1]);
	window.subreddit = datum.url.slice(3, datum.url.length-1);
	window.promise = window.reddit('/r/$subreddit/hot').listing({ 
		$subreddit: subreddit, 
		limit: 50 
	});
	window.load_more();
	console.log($e, datum);
}

window.init_typeahead = function() {
	// constructs the suggestion engine
	var engine = new Bloodhound({
	  datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
	  queryTokenizer: Bloodhound.tokenizers.whitespace,
	  remote: {
		  url: 'https://www.reddit.com/subreddits/search.json?limit=10&q=%QUERY',
		  rateLimitWait: 1000,
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
			  return matches;			  
		  }
	  }
	});
	engine.initialize();
	 
	$('#subreddit').typeahead({
	  hint: true,
	  highlight: true,
	  minLength: 1
	},
	{
	  name: 'subreddit',
	  displayKey: 'value',
	  source: engine.ttAdapter()
	}).bind('typeahead:selected', function($e, datum) {
        changeTypeahead($e, datum);
    }).bind('typeahead:autocompleted', function($e, datum) {
        changeTypeahead($e, datum);
    });
}

$(function() {
	window.templates = {
		entry : Handlebars.compile( $("#entry-template").html())
	};
	
	var $container = $('#content');
	
	window.sorting = 'hot';
	window.subreddit = '';
	
	if(window.location.hash) {
		var parts = window.location.hash.split('/');
		if (3 <= parts.length) {
			window.subreddit = parts[2];
			$('#subreddit').val(window.subreddit);
		} 
		if (4 == parts.length) {
			window.sorting = parts[3];
			$('.navbar .nav li').removeClass('active');
			$('.nav a[data-name="'+window.sorting+'"]').parent().addClass('active');
		}
	}

	if (window.subreddit == '') {
		window.promise = window.reddit('/'+window.sorting).listing({ 
			limit: 50 
		});
	} else {
		window.promise = window.reddit('/r/$subreddit/' + window.sorting).listing({ 
			$subreddit: window.subreddit, 
			limit: 50 
		});	
	}
	
	window.setPath();
	window.load_more();
	
	$('#load_more').on('click', function(e) {
		window.load_more();
	});
	
	$('#nsfw_toggle').on('click', function (e) {
		$('body').toggleClass('sfw');
	});
	
	$('.navbar a').on('click', function(e) {
		console.log(e);
		var $target = $(e.currentTarget);
		var sorting = $target.data('name');
		//console.log(e, $target, sorting);
		if (sorting == '') {
			window.promise = window.reddit('/hot').listing({ limit: 50 });
			sorting = 'hot';
		} else {
			$('.navbar .nav li').removeClass('active');
			$target.parent().addClass('active');
		}
		window.sorting = sorting;
		if (window.subreddit == '') {
			window.promise = window.reddit('/'+window.sorting).listing({ 
				limit: 50 
			});
		} else {
			window.promise = window.reddit('/r/$subreddit/' + window.sorting).listing({ 
				$subreddit: window.subreddit, 
				limit: 50 
			});	
		}
		window.setPath();
		$('#content .item').remove(); // Remove old posts
		window.load_more();
		e.preventDefault();
		return false;
	});
	
	// Typeahead
	init_typeahead();
});