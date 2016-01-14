var Bind = require('github/jxmono/bind');
var Events = require('github/jxmono/events');

module.exports = function (config) {
    var self = this;
    self.config = config;

    // run the binds
    for (var i = 0; i < self.config.binds.length; ++i) {
        Bind.call(self, self.config.binds[i]);
    }
    Events.call(self, config);

    self.on('setTemplate', setTemplate);
    self.on('setQuery', setQuery);
    self.on('showMailChimpUi', showMailChimpUi);
    self.on('hideUi', hideUi);
    self.on('upload', upload);
    self.on('showLoadingIndicator', showLoadingIndicator);
    self.on('hideLoadingIndicator', hideLoadingIndicator);

    // start by getting all the templates
    getTemplates.call(self);
};

function showMailChimpUi () {
    var self = this;
    $(self.config['export'].ui.selectors.target).fadeIn(100);
}

function hideUi () {
    var self = this;
    $(self.config['export'].ui.selectors.target).fadeOut(100);
}

function showLoadingIndicator() {
    var self = this;
    $(self.config['export'].ui.selectors.target).find('.loading-indicator').removeClass('hidden');
}

function hideLoadingIndicator() {
    var self = this;
    $(self.config['export'].ui.selectors.target).find('.loading-indicator').addClass('hidden');
}

function upload () {
    var self = this;

    if (!self.query) {
        alert('No data query set for upload');
        return;
    }
    if (!self.template) {
        alert('No data template set for upload');
        return;
    }

    self.emit("showLoadingIndicator");

    self.link('uploadToMailChimp', {
        data: {
            template: self.template._id,
            query: self.query
        }
    }, function (err) {
        self.emit("hideLoadingIndicator");
        self.emit("hideUi");
    });
}

function setTemplate (templateId) {
    var self = this;

    if (!templateId) {
        delete self.template;
        delete self.query;
        return;
    }

    self.template = JSON.parse(JSON.stringify(self.templates[templateId]));
}

function setQuery (query, options) {
    var self = this;

    self.query = query;
    self.queryOptions = options;
}

function getTemplates () {
    var self = this;

    var query = {};
    var options = {
        fields: {
            _id: 1,
            'options.label': 1
        }
    };

    var crudObj = {
        t: '000000000000000000000000',
        q: query,
        o: options,
        noMerge: true
    };

    // get all template ids
    self.emit('find', crudObj, function (err, data) {

        // handle error
        if (err) {
            console.error(err);
            return;
        }

        // an object with template IDs as keys and template objects as values
        self.templates = {};
        for (var i = 0; i < data.length; ++i) {
            if (data[i]._id === '000000000000000000000004') {
                continue;
            }
            self.templates[data[i]._id] = data[i];
        }
    });
}
