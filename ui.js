var Bind = require('github/jxmono/bind');
var Events = require('github/jxmono/events');

module.exports = function (config) {
    var self = this;
    self.config = config;

    // Run the binds
    for (var i = 0; i < self.config.binds.length; ++i) {
        Bind.call(self, self.config.binds[i]);
    }
    Events.call(self, config);

    self.on('setQuery', setQuery);
    self.on('showMailChimpUi', showMailChimpUi);
    self.on('hideUi', hideUi);
    self.on('upload', upload);
    self.on('showLoadingIndicator', showLoadingIndicator);
    self.on('hideLoadingIndicator', hideLoadingIndicator);

    // The `hideUi` selector is the close button of the MailChimp upload popup
    $(self.config['export'].ui.selectors.hideUi).on('click', function () {
        hideUi.call(self);
    });
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

    self.emit("showLoadingIndicator");

    self.link('uploadToMailChimp', {
        data: {
            query: self.query
        }
    }, function (err) {
        self.emit("hideLoadingIndicator");
        self.emit("hideUi");
    });
}

function setQuery (query, options) {
    var self = this;

    self.query = query;
    self.queryOptions = options;
}
