JZ.Widget.Input.Text.Combo = $.inherit(JZ.Widget.Input.Text, {

	__constructor : function() {

		this.__base.apply(this, arguments);

		this._isListShowed = false;
		this._hilightedIndex = -1;
		this._itemsCount = 0;
		this._lastSearchVal = null;

	},

	_bindEvents : function() {

		this.__base();
		this._element.keyup($.bindContext(this._onKeyUp, this));

	},

	_onFocus : function() {

		this.__base();
		this._updateList();

	},

	_onBlur : function() {

		this.__base();
		this._hideList();

	},

	_onKeyUp : function(event) {

		if(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}

		switch(event.keyCode) {
			case 13:
				this
					._selectItemByIndex(this._hilightedIndex)
					._hideList();
			break;

			case 38:
				this._prev();
			break;

			case 40:
				this._next();
			break;

			default:
				this._updateList();
		}

	},

	_prev : function() {

		this._isListShowed && this._hilightItemByIndex((this._hilightedIndex > 0? this._hilightedIndex : this._itemsCount) - 1);

	},

	_next : function() {

		this._isListShowed && this._hilightItemByIndex(this._hilightedIndex < this._itemsCount - 1? this._hilightedIndex + 1 : 0);

	},

	_hilightItemByIndex : function(index) {

		this._getList().find('li')
			.eq(this._hilightedIndex).removeClass(this.__self.CSS_CLASS_SELECTED).end()
			.eq(index).addClass(this.__self.CSS_CLASS_SELECTED);

		this._hilightedIndex = index;

	},

	_selectItemByIndex : function(index) {

		if(!this._isListShowed) {
			return this;
		}

		return this.setValue(this.createValue(this._getList().find('li').eq(index).text()));

	},

	_showList : function() {

		if(this._isListShowed) {
			return;
		}

		this._getListContainer().removeClass(this.__self.CSS_CLASS_HIDDEN);
		this._isListShowed = true;

	},

	_hideList : function() {

		if(!this._isListShowed) {
			return;
		}

		this._getListContainer().addClass(this.__self.CSS_CLASS_HIDDEN);
		this._isListShowed = false;

	},

	_updateList : function() {

		var val = this._element.val();
		if(this._lastSearchVal === val) {
			return this._showList();
		}
		this._lastSearchVal = val;
		this._getStorage().filter(val, $.bindContext(function(list) {
			this._itemsCount = list.length;
			this._hilightedIndex = -1;
			if(!!list.length) {
				this._getList().html($.map(list, function(val) {
					return '<li>' + val + '</li>';
				}).join(''));
				this._showList();
			}
			else {
				this._hideList();
			}
		}, this));

	},

	_getListContainer : function(onlyForDestruct) {

		if(onlyForDestruct) {
			return $('<div/>');
		}

		var result = $('<div class="' + this.__self.CSS_CLASS_LIST + ' ' + this.__self.CSS_CLASS_HIDDEN + '">' +
		   '<iframe frameborder="0" src="javascript:' + "'<body style=\\'background:none\;overflow:hidden\\'>'" +
		   '"></iframe><ul/></div>')
			.mousedown($.bindContext(function(event) {
				this.setValue(this.createValue($(event.target).closest('li').text()));
				this
					.focus()
					._hideList();
			}, this));
		this._element.after(result);
		return (this._getListContainer = function() {
			return result;
		})();

	},

	_getList : function() {

		var result = this._getListContainer().find('ul');
		return (this._getList = function() {
			return result;
		})();

	},

	_getStorage : function() {

		var result = new JZ.Storage(this._params.storage);
		return (this._getStorage = function() {
			return result;
		})();

	},

	_destruct : function() {

		this.__base();
		this._getList(true).unbind();

	}

}, {

	CSS_CLASS_LIST : JZ.CSS_CLASS_WIDGET + '-list'

});