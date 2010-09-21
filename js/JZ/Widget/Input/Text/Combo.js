JZ.Widget.Input.Text.Combo = $.inherit(JZ.Widget.Input.Text, {

	__constructor : function() {

		this.__base.apply(this, arguments);

		this._isListShowed = this._preventOnBlur = this._preventOnFocus = this._preventUpdate = this._focusOnBlur = false;
		this._hilightedIndex = -1;
		this._itemsCount = 0;
		this._lastSearchVal = this._keyDownValue = this._updateList = this._reposTimer = this._lastOffset = null;

	},

	_init : function() {

		this.__base()._elem.attr('autocomplete', 'off');
		this._params.arrow && this._params.arrow.attr('tabIndex', -1);
		this._updateList = $.debounce(function(val) {

			if(this._elem) { // widget not destructed
				if(!this._params.showListOnEmpty && this._elem.val() === '') {
					return this._hideList();
				}
				var searchVal = typeof val == 'undefined'? this._elem.val() : val;
				this._getStorage().filter(this._lastSearchVal = searchVal, $.proxy(this._onStorageFilter, this));
			}

		}, this._params.debounceInterval);

		return this;

	},

	_onStorageFilter : function(searchVal, list) {

		if(this._lastSearchVal == searchVal) {

			this._itemsCount = list.length;
			this._hilightedIndex = -1;

			if(!list.length) {
				return this._hideList();
			}

			var _this = this,
				elemVal = _this._elem.val(),
				listElem = _this._getList(),
				itemRenderFn = _this._params.listItemRenderFn,
				html = [],
				i = 0, item, len = list.length,
				isSelected;

			while(i < len) {
				item = list[i++];
				isSelected = elemVal == item.valueOf(),
				html.push('<li');
				isSelected && html.push(' class="',  _this.__self.CSS_CLASS_SELECTED, '"');
				html.push('>');
				itemRenderFn(item, html, elemVal, isSelected);
				isSelected && (_this._hilightedIndex = i - 1);
			}

			listElem
				.html(html.join(''))
				.css('height', 'auto');

			this._showList();

			list.length > this._params.listSize &&
				listElem.css('height', listElem.find('li:first').outerHeight() * this._params.listSize);

		}

	},

	_bindEvents : function() {

		var keyDown = $.browser.opera? 'keypress' : 'keydown',
			keyBinds = { 'keyup' : this._onKeyUp };

		keyBinds[keyDown] = this._onKeyDown;
		this
			.__base()
			._bindToElem(keyBinds);

		var arrow = this._params.arrow;
		arrow && this
			._bindTo(arrow, {
				'mousedown' : this._onArrowMouseDown,
				'mouseup'   : this._onArrowMouseUp,
				'click'     : this._onArrowClick
			});

		return this;

	},

	_onFocus : function() {

		if(!this._preventOnFocus) {
			this.__base();
			if(!this._preventUpdate) {
				if(this._params.showAllOnFocus) {
					this._updateList('');
					this._lastSearchVal = this._elem.val();
				}
				else {
					this._updateList();
				}
			}
			else {
				this._preventUpdate = false;
			}
		}
		else {
			this._preventOnFocus = false;
		}

	},

	_onBlur : function() {

		if(!this._preventOnBlur) {
			this.__base();
			this._hideList();
		}
		else {
			this._preventOnBlur = false;
		}

		if(this._focusOnBlur) {
			this._focusOnBlur = false;
			setTimeout($.proxy(function() {
				this
					.focus()
					._refocus();
			}, this), 0);
		}

	},

	_onArrowMouseDown : function() {

		if(this.isEnabled()) {
			this._preventOnBlur = true;
			this._params.arrow.addClass(this.__self.CSS_CLASS_ARROW_PRESSED);
		}

	},

	_onArrowMouseUp : function() {

		this.isEnabled() &&
			this._params.arrow.removeClass(this.__self.CSS_CLASS_ARROW_PRESSED);

	},

	_onArrowClick : function() {

		if(!this.isEnabled()) {
			return;
		}

		if(this._isListShowed) {
			this._hideList();
			this._preventOnFocus = true;
			this.focus();
		}
		else {
			this._preventUpdate = true;
			this
				.focus()
				._refocus()
				._updateList('');
			this._preventOnBlur = false;
		}
		return false;

	},

	_onKeyDown : function(e) {

		if(this._keyDownValue !== null) {
			return;
		}

		this._keyDownValue = this._elem.val();
		if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
			return;
		}

		switch(e.keyCode) {
			case 13:
				if(this._isListShowed) {
					this
                        .val(this._lastSearchVal = this._keyDownValue)
                        ._hideList();
					return false;
				}
			break;

			case 38:
				this._prev();
				return false;

			case 40:
				this._next();
				return false;
		}

	},

	_onKeyUp : function(e) {

		if(!this._isFocused || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
			return;
		}

		e.keyCode != 9 && this._keyDownValue != this._elem.val() && this._updateList();
		this._keyDownValue = null;

	},

	_prev : function() {

		this._isListShowed &&
			this._hilightItemByIndex((this._hilightedIndex > 0? this._hilightedIndex : this._itemsCount) - 1);

	},

	_next : function() {

		this._isListShowed &&
			this._hilightItemByIndex(this._hilightedIndex < this._itemsCount - 1? this._hilightedIndex + 1 : 0);

	},

	_hilightItemByIndex : function(index) {

		var listElem = this._getList(),
			itemElems = listElem.find('li').eq(this._hilightedIndex)
				.removeClass(this.__self.CSS_CLASS_SELECTED)
				.end(),
			hilightedElem = itemElems.eq(this._hilightedIndex = index).addClass(this.__self.CSS_CLASS_SELECTED),
			itemHeight = hilightedElem.outerHeight(),
			topIndex = Math.ceil(listElem.scrollTop() / itemHeight),
			newTopIndex = topIndex;

		if(index >= topIndex + this._params.listSize) {
			newTopIndex = index + 1 - this._params.listSize;
		}
		else if(index < topIndex) {
			newTopIndex = index;
		}

		topIndex == newTopIndex || listElem.scrollTop(itemHeight * newTopIndex);

		this
			._selectItemByIndex(hilightedElem)
			._keyDownValue = this.val();

	},

	_selectItemByIndex : function(itemElem) {

		if(this._isListShowed) {
			var node = this
				.val(this._lastSearchVal = itemElem.text())
				._elem[0];
			if(node.createTextRange && !node.selectionStart) {
				var range = node.createTextRange();
				range.move('character', this._elem.val().length);
				range.select();
			}
		}

		return this;

	},

	_showList : function() {

		if(this._isListShowed || !this._isFocused || !this._itemsCount ||
			(this._itemsCount == 1 && this._hilightedIndex == 0)) {
			return;
		}

		this._getListContainer().removeClass(this.__self.CSS_CLASS_INVISIBLE);
		this._reposList();
		this._isListShowed = true;

	},

	_hideList : function() {

		if(this._isListShowed) {
			this._reposTimer && clearTimeout(this._reposTimer);
			this._getListContainer().addClass(this.__self.CSS_CLASS_INVISIBLE);
			this._isListShowed = false;
		}

	},

	_reposList : function() {

		var offset = this._elem.offset(),
			offsetLeft = offset.left,
			offsetTop = offset.top + this._elem.outerHeight();

		if(!(this._lastOffset && this._lastOffset.left == offsetLeft && this._lastOffset.top == offsetTop)) {
			this._lastOffset = { left : offsetLeft, top : offsetTop };
			this._getListContainer()
				.css({
					width : this._elem.outerWidth() + 'px',
					left  : offsetLeft + 'px',
					top   : offsetTop + 'px'
				});
		}

		this._params.reposList && (this._reposTimer = setTimeout($.proxy(arguments.callee, this), 50));

	},

	_getListContainer : $.memoize(function() {

		var result = $('<div class="' + this.__self.CSS_CLASS_LIST + ' ' + this.__self.CSS_CLASS_INVISIBLE + '">' +
		   '<iframe frameborder="0" tabindex="-1" src="javascript:void(0)"/><ul/></div>');

		this._bindTo(result, 'mousedown', function(e) {
			var itemElem = $(e.target).closest('li');

			this._preventUpdate = this._focusOnBlur = true;
			if(itemElem[0]) {
				this
					.val(this._lastSearchVal = itemElem.text())
					.focus()
					._hideList();
			} else {
				this._preventOnBlur = true;
			}

			setTimeout($.proxy(function() {
				this._focusOnBlur = false;
			}, this), 50);

			return false;
		});

		return result.appendTo('body');

	}),

	_getList : $.memoize(function() {

		return this._getListContainer().find('ul');

	}),

	_getStorage : $.memoize(function() {

		var _this = this;
		return _this._params.storage.source == 'remote'?
			new JZ.Storage.Remote($.extend({
					name : _this._params.storage.name || this.getName(),
					widgets : $.map((_this._params.storage.values || '').split(','), function(name) {
						name = $.trim(name);
						return name? _this._form.getWidgetByName(name) : null;
					})
				}, _this._params.storage)) :
			new JZ.Storage.Local(_this._params.storage);

	}),

	_refocus : function() {

		if(document.selection) {
			var range = this._elem[0].createTextRange(),
				len = this._elem.val().length;
			range.collapse(true);
			range.moveStart('character', len);
			range.moveEnd('character', len);
			range.select();
		}
		return this;

	},

	_enableElems : function() {

		this.__base();
		this._enableArrow(true);
	},

	_disableElems : function() {

		this.__base();
		this._enableArrow(false);

	},

	_enableArrow : function(enable) {

		var arrowElem = this._params.arrow;
		arrowElem &&
			(arrowElem[(enable? 'remove' : 'add') + 'Class'](this.__self.CSS_CLASS_DISABLED))[0].tagName == 'INPUT' &&
			arrowElem.attr('disabled', !enable);

	},

	_getDefaultParams : function(params) {

		return $.extend(this.__base(), {
			listSize         : 5,
			showAllOnFocus   : false,
			showListOnEmpty  : true,
			reposList        : false,
			debounceInterval : params.storage.source == 'remote'? 200 : 50,
			listItemRenderFn : this.__self._listItemRenderFn
		});

	},

	_destruct : function() {

		this._hideList();
		this.__base();
		this._getListContainer().remove();

	},

	_unbindAll : function() {

		this.__base();
		this._params.arrow && this._params.arrow.unbind();

	}

}, {

	CSS_CLASS_LIST          : JZ.CSS_CLASS_WIDGET + '-list',
	CSS_CLASS_ARROW_PRESSED : JZ.CSS_CLASS_WIDGET + '-comboarrow-pressed',

	_listItemRenderFn : function(item, buffer, searchVal) {

		var startIndex = item.toLowerCase().indexOf(searchVal.toLowerCase());
		startIndex > -1?
			buffer.push(
				item.substr(0, startIndex),
				'<strong>',
				item.substr(startIndex, searchVal.length),
				'</strong>',
				item.substr(startIndex + searchVal.length)) :
			buffer.push(item);

	}

});