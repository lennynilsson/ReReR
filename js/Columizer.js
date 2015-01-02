/**
 * Copyright (C) 2014 Lenny Nilsson
 */

"use strict";

var Columizer = function(_settings) {
	
    var settings = _.extend({
		card: '.card',
		container: '#content',
		columnSize: 400,
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
	var cards = [];
	
	function init() {
		$(window).resize(_.debounce(function() {
			//console.log('Resize');
			resetLayout();
			layout(0, cards.length);
		}, 300));
		reset();
	}

	function resetLayout() {
		width = $container.innerWidth();
		columnCount = Math.max(1, Math.floor((width + settings.gutterSize) / (settings.columnSize + settings.gutterSize)));
		columnWidth = (width - (settings.gutterSize * (columnCount - 1))) / columnCount;
		columns = [];
		offsets = [];
		for (var c = 0; c < columnCount; c++) {
			columns[c] = 0;
			offsets[c] = c * columnWidth + c * settings.gutterSize;
		}
		//console.log('Width: ', width, ' Column width: ', columnWidth, ' Column count: ', columnCount);
	}
	
	function reset() {
		cards = [];
		$container.css('height', 'initial').empty();
		resetLayout();
	}

	function getShortestColumn() {
		var column = 0;
		var top = columns[column];
		for (var c = 1; c < columnCount; c++) {
			if (columns[c] < top) {
				column = c;
				top = columns[column];
			}
		}	
		return column;	
	}

	function addColumnLength(column, length) {
		columns[column] += length;
	}

	function layoutCard(card) {
		//console.log(card);
		var cardHeight = card.$card.outerHeight();
		var column = getShortestColumn();
		var top = columns[column];
		var left = offsets[column];
		card.$card.css({
			top: top,
			left: left,
			width: columnWidth,
			opacity: 1.0
		});
		if (0 < cardHeight) {
			addColumnLength(column, settings.gutterSize + cardHeight);
		}
	}
	
	function layout() {
		resetLayout();
		// Position cards
		for (var i = 0; i < cards.length; i++) {
			layoutCard(cards[i]);
		}
		$container.css('height', Math.max.apply(Math, columns));
	}

	function show(id) {
		layout(0, cards.length);
	}

	function add(id, $card) {
		//console.log('Added: ', id);
		var card = {
			id : id,
			$card: $card
		};
		cards[id] = card;
		card.$card.css({
			/* All cards are positioned absolute */
			position: 'absolute',
			/* Hide the card until it is loaded */
			opacity: 0.0,
			/* Set width to get an accurate height later */
			width: columnWidth
		}).appendTo($container);
	}

	return {
		init: init,
		reset: reset,
		layout: function() {
			layout(0, cards.length);
		},
		show: show,
		add: add,
		settings: settings,
		columnWidth: columnWidth
	};
};