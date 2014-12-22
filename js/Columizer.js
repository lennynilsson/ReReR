/**
 * Copyright (C) 2014 Lenny Nilsson
 */

"use strict";

var Columizer = function(_settings) {
	
    var settings = $.extend({
		item: '.item',
		container: '#content',
		columnSize: 480,
		gutterSize: 15,
		fetch: function(callback) { callcack([]); }
    }, _settings);
	var self = this;
	var $container = $(settings.container);
	var width = 0;
	var columnWidth = 0;
	var columnCount = 0;
	var columns = [];
	var offsets = [];
	
	function init() {
		$(window).resize(_.debounce(function() {
			init();
			layout();
		}, 300));
		reset();
	}
	
	function reset() {
		width = $container.innerWidth();
		columnCount = Math.floor((width + settings.gutterSize) / (settings.columnSize + settings.gutterSize));
		columnWidth = (width - (settings.gutterSize * (columnCount - 1))) / columnCount;
		columns = [];
		offsets = [];
		for (var c = 0; c < columnCount; c++) {
			columns[c] = 0;
			offsets[c] = c * columnWidth + c * settings.gutterSize;
		}
	}
	
	function load() {
		$('<img/>').attr('src', 'http://picture.de/image.png').load(function() {
		   $(this).remove(); // prevent memory leaks as @benweet suggested
		   $('body').css('background-image', 'url(http://picture.de/image.png)');
		});
	}
	
	function layout() {
		reset();
		$container.css('height', 'initial');
		var items = $container.find(settings.item);
		// Position items
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			var $item = $(item);
			$item.css('width', columnWidth);
			var itemHeight = $item.outerHeight();
			var column = 0;
			var top = columns[column];
			for (var c = 1; c < columnCount; c++) {
				if (columns[c] < top) {
					column = c;
					top = columns[column];
				}
			}
			columns[column] = columns[column] + settings.gutterSize + itemHeight;
			$item
				.css('top', top)
				.css('left', offsets[column])
				.css('position', 'absolute')
				.css('opacity', 1.0);
			$container.css('height', Math.max.apply(Math, columns));
		}
	}
	
	return {
		init: init,
		reset: reset,
		layout: layout
	};
};