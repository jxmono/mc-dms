var Bind = require('github/jxmono/bind');
var Events = require('github/jxmono/events');

module.exports = function (config) {
    var self = this;
    self.config = config;

    // This variable stores `true` or `false` depending on whether an upload
    // request is in progress or not
    self.uploadRequestInProgress = false;

    // Run the binds
    for (var i = 0; i < self.config.binds.length; ++i) {
        Bind.call(self, self.config.binds[i]);
    }
    Events.call(self, config);

    // Set the default selectors
    self.config.ui = self.config.ui || {};
    self.config.ui.selectors = self.config.ui.selectors || {};
    self.config.ui.selectors = $.extend({
        target: '#mc_container',
        hideUi: '.close-form',
        loadingIndicator: '.loading-indicator',
        closeButton: '.close-btn'
    }, self.config.ui.selectors);

    // Cache some jQuery elements
    self.$popup = $(self.config.ui.selectors.target);
    self.$loadingIndicator = self.$popup.find(self.config.ui.selectors.
            loadingIndicator);
    self.$closeBtn = self.$popup.find(self.config.ui.selectors.closeButton);

    // Set up the event handlers
    self.on('setQuery', setQuery);
    self.on('showMailChimpUi', showMailChimpUi);
    self.on('hideUi', hideUi);
    self.on('upload', upload);

    // The `hideUi` selector is the close button of the MailChimp upload popup
    $(self.config.ui.selectors.hideUi).add(self.$closeBtn)
            .on('click', function () {
        if (self.uploadRequestInProgress) { return; }

        hideUi.call(self);
    });
};

function showMailChimpUi () {
    var self = this;
    self.$popup.fadeIn(100);
}

function hideUi () {
    var self = this;
    self.$popup.fadeOut(100);
    self.$closeBtn.addClass('disabled');
    self.$loadingIndicator.text('Loading...').addClass('hidden');
}

function upload () {
    var self = this;

    if (!self.query) {
        alert('No data query set for upload');
        return;
    }
    self.uploadRequestInProgress = true;
    self.$loadingIndicator.removeClass('hidden');

    self.link('uploadToMailChimp', {
        data: {
            query: self.query
        }
    }, function (err) {
        self.$loadingIndicator.text('Upload under way, it will be done in about 5 minutes.');
        self.$closeBtn.removeClass('disabled');
        self.uploadRequestInProgress = false;
    });
}

function setQuery (query, options) {
    var self = this;

    self.query = query;
    self.queryOptions = options;
}
