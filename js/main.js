"use strict";

window.getForm = function(form) {
    var formObj = {};
    var inputs = $(form).serializeArray();
    $.each(inputs, function (i, input) {
        formObj[input.name] = input.value;
    });
    return formObj;
}

window.populate = function(slice) {
    var $content = $('#content');
    var html = '';
    for (var s in slice) {
    	var data = slice[s].data;
    	var content_image = false;
    	var content_video = false;
    	var content_text = false;
    	var content_raw = false;
    	if (data.media && data.media.oembed) {
    		content_raw = data.media.oembed.content
    	} else if (data.is_self) {
    		content_raw = data.selftext_html;
    	} else {
        	switch (data.domain) {
		    	case '31.media.tumblr.com':
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
    		nsfw: data.over_18 ? 'nsfw' : false,
    		rating: data.score,
    		num_comments: data.num_comments,
    		comments_url: 'http://reddit.com' + data.permalink,
    		author: data.author,
    		author_url: 'http://www.reddit.com/user/' + data.author,
    		subreddit: '/r/' + data.subreddit,
    		subreddit_url: 'http://reddit.com/r/' + data.subreddit
    	});
    	console.log({
    		title: data.title,
    		source: data.domain,
    		source_url: data.url,
    		content_video: content_video,
    		content_text: content_text,
    		content_image: content_image,
    		nsfw: data.over_18,
    		rating: data.score,
    		num_comments: data.num_comments,
    		comments_url: 'http://reddit.com' + data.permalink,
    		author: data.author,
    		author_url: 'http://www.reddit.com/user/' + data.author,
    		subreddit: '/r/' + data.subreddit,
    		subreddit_url: 'http://reddit.com/r/' + data.subreddit
    	});
    }
	$content.append($(html)).masonry();
}

window.reddit = new Snoocore({ 
	userAgent: 'ReReR/0.1 by netcrawler',
    oauth: { 
        type: 'web',
        consumerKey: 'hBA0ehFp--9Xzw',
        scope: [ 'flair', 'identity', 'read', 'report', 'save', 'subscribe', 'vote']
    }
});

$(function() {
	window.templates = {
		entry : Handlebars.compile( $("#entry-template").html())
	};
	window.promise = window.reddit('/hot').listing({ limit: 30 });

	$('#load_more').button('Loading...');
	window.promise.then(function(slice) {
	    console.log(slice);
	    $('#load_more').button('reset');
	    populate(slice.children);
	    window.promise = slice.next();
	});
	
	$('#load_more').on('click', function(e) {
		$('#load_more').button('Loading...');
	    populate(window.promise.children);
	    $('#load_more').button('reset');
	    window.promise = slice.next();
	});

	window.masonry = new Masonry($('#content'), {
	  columnWidth: 476,
	  itemSelector: '.item'
	});
});