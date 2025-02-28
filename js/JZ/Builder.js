JZ.Builder = $.inherit({

    __constructor : function() {

        this._widgets = [];
        this._widgetsByName = {};
        this._widgetsById = {};

    },

    build : function(elem) {

        var _this = this, fromIndex = this._widgets.length, widget, initWidget;
        $.each(elem.add(elem.find('.' + JZ.CSS_CLASS_WIDGET)), function(i) {
            widget = _this._makeWidgetByElem($(this));
            _this._widgets.push(_this._widgetsById[widget.getId()] = widget);
            i == 0 && (initWidget = widget);
        });

        // Строим хэш по именам после создании дерева виджетов, потому что имена некоторых виджетов зависят от детей
        var widgets = _this._widgets, i = fromIndex;
        while(widget = widgets[i++]) {
            widget._hasVal() && (_this._widgetsByName[widget.getName()] = widget);
        }

        // Перебираем, строим зависимости, потому что только здесь знаем имена виджетов
        while(widget = widgets[fromIndex++]) {
            this._buildDependencies(widget);
        }

        if(elem[0].tagName.toLowerCase() == 'form') {
            elem.data('jz-builder', this);
            initWidget
                .bind('remove', $.proxy(this._onFormRemove, this))
                .init();
        }
        else {
            widgets[0].init(false, initWidget);
        }

        return initWidget;

    },

    _makeWidgetByElem : function(elem) {

        var _self = this.__self,
            params = _self._extractParamsFromElem(elem),
            result = new (_self._getWidgetClassByType(params.type))(elem, _self._getClassElem(elem, params), params);

        params.type != 'form' && this._getParentWidget(elem).addChild(result);

        return result;

    },

    _getParentWidget : function(elem) {

        var node = elem[0].parentNode,
            className = ' ' + JZ.CSS_CLASS_WIDGET + ' ';
        do {
            if((' ' + node.className + ' ').indexOf(className) > -1) {
                return this._widgetsById[JZ._identifyNode(node)];
            }
        } while(node = node.parentNode);

    },

    _buildDependencies : function(widget) {

        var params = widget._params, _this = this;
        $.each(['enabled', 'valid', 'required'], function() {
            this in params && widget.addDependence(this, _this._buildDependence(this, widget, params[this]));
        });

    },

    _buildDependence : function(type, widget, data) {

        return $.isArray(data)?
            (typeof data[0] == 'string'?
                new JZ.Dependence.Composition.NOT({ dependencies : [this._buildDependence(type, widget, data[1])] }) :
                new JZ.Dependence.Composition[data[1].toUpperCase()]({ dependencies :
                    [this._buildDependence(type, widget, data[0]), this._buildDependence(type, widget, data[2])] })) :
            new JZ.Dependence[type.charAt(0).toUpperCase() + type.substr(1).toLowerCase()](
                $.extend(data, { widget : this._getFromWidget(data, widget) }));

    },

    _getFromWidget : function(params, widget) {

        return params.id?
             this._widgetsById[params.id] :
             (params.name?
                 this._widgetsByName[params.name] :
                 widget) ||
            JZ._throwException('widget with name/id = "' + (params.id || params.name) + '" not found"');

    },

    _onFormRemove : function(e, form) {

        form.getElement().removeData('jz-builder');

        delete this._widgets;
        delete this._widgetsByName;
        delete this._widgetsById;

    }

},
{

    registerWidget : function(type, parentType, props, staticProps) {

        if(typeof parentType != 'string') {
            staticProps = props;
            props = parentType;
            parentType = undefined;
        }

        this._types.push(type);
        this._typeToWidgetClass[type] = $.inherit(
            parentType? this._getWidgetClassByType(parentType) : JZ.Widget,
            props,
            staticProps);

    },

    _getClassElem : function(elem, params) {

        if(params.container) {
            return elem.closest(params.container);
        }

        switch(params.type) {
            case 'form':
            case 'fieldset':
            case 'button':
            case 'submit':
                return elem;

            case 'rbgroup':
            case 'cbgroup':
            case 'state':
                return elem.parent();

            default:
                return elem.attr('type') == 'hidden'? elem : elem.parent().parent();
        }

    },

    _extractParamsFromElem : function(elem) {

        var result = elem[0].onclick? elem[0].onclick().jz || {} : {};

        result.type || (result.type = this._extractTypeFromElem(elem));

        if(result.type == 'combo') {
            var arrow = elem.parent().find('.' + JZ.CSS_CLASS_WIDGET + '-comboarrow');
            arrow.length && (result.arrow = arrow);
        }

        return result;

    },

    _extractTypeFromElem : function(elem) {

        var tagName = elem[0].tagName.toLowerCase();

        if(tagName == 'input') {
            switch(elem.attr('type')) {
                case 'radio':
                case 'checkbox':
                    return 'state';

                case 'button':
                    return 'button';

                case 'image':
                case 'submit':
                    return 'submit';
            }
        }

        return tagName == 'select' || tagName == 'fieldset' || tagName == 'form'?
            tagName :
            (this._cssClassToType(elem.attr('class')) || 'text');

    },

    _types : ['number', 'combo', 'datetime', 'date', 'fieldset', 'rbgroup', 'cbgroup', 'submit'],
    _typeRE : null,

    _rebuildTypeRE : function() {

        return this._typeRE = new RegExp(JZ.CSS_CLASS_WIDGET + '-(' + this._types.join('|') +')(?:\\s|$)');

    },

    _cssClassToType : function(cssClass) {

        return (cssClass.match(this._typeRE || this._rebuildTypeRE()) || [])[1];

    },

    _typeToWidgetClass : {
        'text'       : JZ.Widget.Input.Text,
        'number'   : JZ.Widget.Input.Text.Number,
        'combo'    : JZ.Widget.Input.Text.Combo,
        'select'   : JZ.Widget.Input.Select,
        'date'     : JZ.Widget.Container.Date,
        'datetime' : JZ.Widget.Container.Date.Time,
        'state'    : JZ.Widget.Input.State,
        'button'   : JZ.Widget.Button,
        'submit'   : JZ.Widget.Button.Submit,
        'fieldset' : JZ.Widget.Container,
        'rbgroup'  : JZ.Widget.Container.StateGroup.RadioButtons,
        'cbgroup'  : JZ.Widget.Container.StateGroup.CheckBoxes,
        'form'       : JZ.Widget.Container.Form
    },

    _getWidgetClassByType : function(type) {

        return this._typeToWidgetClass[type] || JZ._throwException('undefined type "' + type + '"');

    }

});