"use strict";

var App = function() {
	var self = this;
	var subreddit = null;
	var sorting = null;
	var $container = $('#content');
	var $subreddit = $('#subreddit');
	var $load_more = $('#load_more');
	var columizer = null;
	var cardProvider = null;
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
			  return matches;
		  }
	  }
	});

	function updateUI() {
		$('#subreddit').val(subreddit);
		$('.navbar .nav li').removeClass('active');
		$('.nav a[data-sorting="'+sorting+'"]').parent().addClass('active');
	}
	
	function loadMore() {
		$load_more.button('loading');
		cardProvider.more();
	}
	
	function setLocation(_subreddit, _sorting, _title) {	
		var changed = sorting != _sorting || subreddit != _subreddit;
		if (_.isEmpty(_subreddit)) {
			_subreddit = '';
		}
		if (_.isEmpty(_sorting)) {
			_sorting = 'hot';
		}
		console.log(_subreddit, _sorting);
		if (changed) {
			if (!_.isEmpty(_title)) {
				document.title = _title;
			}
			subreddit = _subreddit;
			sorting = _sorting;
			$container.empty();
			updateUI();
			setPath();
			columizer.reset();
			$load_more.button('loading').removeAttr('disabled');
			cardProvider.reset(subreddit, sorting);
			$('body').scrollTop(0);
			/*
			if (subreddit != '') {
				cardProvider.api('/r/$subreddit/about.json').get({
					$subreddit: subreddit
				}).then(function(info) {
					document.title = info.data.title;
				});
			}
			*/
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

	function setPath() {
		var hash = '#' + ((0 < subreddit.length) ? '/r/' + subreddit : '') + '/' + sorting;
		if(history.pushState) {
		    history.pushState(null, null, hash);
		} else {
		    location.hash = hash;
		}
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
		$load_more.on('click', loadMore);		
		$('#nsfw_toggle').on('click', toggleNSFW);
		$('[data-sorting]').on('click', function(e) {
			e.preventDefault();
			var _sorting = $(e.currentTarget).data('sorting');
			setLocation(subreddit, _sorting);
			return false;
		});
		if (store.get('disclaimer')) {
			$('#disclaimer').remove();
		} else {
			$('#disclaimer').on('closed.bs.alert', function () {
				store.set('disclaimer', true);
			});			
		}
		/*
		$('#subreddit-form').keypress(function(e) {
			if (e.which == 13) {
				setLocation($subreddit.val(), sorting);
				return false;
			}
		});
		*/
		$('#subreddit-form').submit(function(e) {
			e.preventDefault();
			$subreddit.typeahead('close');
			setLocation($subreddit.val(), sorting);
			return false;
		});
	}

	function initTypeahead() {
		bloodhound.initialize();
		$subreddit.typeahead({
			  hint: true,
			  highlight: true,
			  minLength: 1
			},
			{
			  name: 'subreddits',
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
		columizer = new Columizer();
		columizer.init();
		cardProvider = new CardProvider({
			onLoad: columizer.add,
			onAvailable: columizer.show,
			onAllAvailable: function() {
				$load_more.button('reset');
			},
			onNoMore: function() {
				$load_more.attr('disabled','disabled');
			},
			onAction: function(location) {
				setLocation(location);
			}
		});
		cardProvider.init();
		initLocation();
		initHooks();
		initTypeahead();
	}
	
	return {
		init: init,
		load: loadMore
	};
};

var app = new App();

$(function() {
	app.init();
});



