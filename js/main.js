"use strict";

window.getForm = function(form) {
    var formObj = {};
    var inputs = $(form).serializeArray();
    $.each(inputs, function (i, input) {
        formObj[input.name] = input.value;
    });
    return formObj;
}

window.parse = function(slice) {
    var html = '';
    for (var s in slice) {
    	var data = slice[s].data;
    	var content_image = false;
    	var content_video = false;
    	var content_text = false;
    	var content_raw = false;
    	console.log(data);
    	if (data.media && data.media.oembed) {
    		content_raw = data.media.oembed.content
    	} else if (data.is_self) {
    		content_raw = data.selftext_html;
    	} else {
        	switch (data.domain) {
		    	case '31.media.tumblr.com':
		    	case 'i.imgur.com':
		    		content_image = 'http://i.'+data.url.substring(7)+'.jpg';
		    		break;
		    	case 'i.imgur.com':
		    		content_image = data.url;
		    		break;
		    	default:
		    		content_image = data.thumbnail;
        	}    		
    	}
    	html += window.templates.entry({
    		title: data.title,
    		source: data.domain,
    		source_url: data.url,
    		content_video: content_video,
    		content_text: content_text,
    		content_image: content_image,
    		content_raw: content_raw,
    		nsfw: data.over_18,
    		has_raw: content_raw != false,
    		rating: data.score,
    		num_comments: data.num_comments,
    		comments_url: 'http://reddit.com' + data.permalink,
    		author: data.author,
    		author_url: 'http://www.reddit.com/user/' + data.author,
    		subreddit: '/r/' + data.subreddit,
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
	button.button('Loading...');
	window.promise.then(function(slice) {
	    button.button('reset');
	    var $html = $(window.parse(slice.children));
	    var $container = $('#content');
	    $container.append($html);
	    imagesLoaded($container[0], function() {
	    	$container.masonry();
    	});
	    window.promise = slice.next();
	    return window.promise;
	});
}

window.changeTypeahead = function($e, datum) {
	document.title = datum.description;
	window.location.hash = datum.url;
	$('#content').find('.item').remove();
	console.log(datum.url.split('/')[1]);
	window.promise = window.reddit('/r/$subreddit/hot').listing({ 
		$subreddit: datum.url.slice(3, datum.url.length-1), 
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

	window.masonry = new Masonry($container[0], {
		isInitLayout: false,
		gutter: '.gutter-sizer',
		columnWidth: '.grid-sizer',
		itemSelector: '.item'
	});
	
	// Load posts
	window.promise = window.reddit('/hot').listing({ limit: 50 });
	window.load_more();
	
	$('#load_more').on('click', function(e) {
		window.load_more();
	});
	
	// Typeahead
	init_typeahead();
});