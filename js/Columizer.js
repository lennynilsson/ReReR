/**
 * Copyright (C) 2014 Lenny Nilsson
 */

"use strict";

var Columizer = function(_settings) {
	
    var settings = _.extend({
		card: '.card',
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
	var cards = [];
	var lastShownId = -1;
	
	function init() {
		$(window).resize(_.debounce(function() {
			resetLayout();
			layout(0, cards.length);
		}, 300));
		reset();
	}

	function resetLayout() {
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
	
	function reset() {
		cards = [];
		lastShownId = -1;
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
		card.$card.css('width', columnWidth);
		if (!card.available) {
			card.available = true;
			card.$card.css({
				position: 'absolute'
			}).appendTo($container);
			//console.log('Shown: ', card.id);
		}
		var cardHeight = card.$card.outerHeight();
		var column = getShortestColumn();
		var top = columns[column];
		var left = offsets[column];
		card.$card.css({
			top: top,
			left: left
		});
		if (0 < cardHeight) {
			addColumnLength(column, settings.gutterSize + cardHeight);
		}
	}
	
	function layout(from, to) {
		to = Math.min(to, cards.length);
		// Position cards
		for (var i = from; i < to; i++) {
			layoutCard(cards[i]);
		}
		$container.css('height', Math.max.apply(Math, columns));
	}

	function show(id) {
		if (lastShownId <= id) {
			// Create layout from last shown id
			layout(lastShownId + 1, id + 1);
			lastShownId = id;			
		} else {
			// Redo layout
			resetLayout();
			layout(0, lastShownId + 1);
		}

	}

	function add(id, $card) {
		//console.log('Added: ', id);
		cards.push({
			id : id,
			$card: $card,
			available: false
		});
	}

	return {
		init: init,
		reset: reset,
		layout: layout,
		show: show,
		add: add,
		settings: settings,
		columnWidth: columnWidth
	};
};