var Bind = require('github/jxmono/bind');
var Events = require('github/jxmono/events');

module.exports = function (config) {
    var self = this;
    self.config = config;
    self.uploadRequestInProgress = false;

    // Run the binds
    for (var i = 0; i < self.config.binds.length; ++i) {
        Bind.call(self, self.config.binds[i]);
    }
    Events.call(self, config);

    self.$popup = $(self.config['export'].ui.selectors.target);
    self.$loadingIndicator = self.$popup.find('.loading-indicator');
    self.$closeBtn = self.$popup.find('.close-btn');

    self.on('setQuery', setQuery);
    self.on('showMailChimpUi', showMailChimpUi);
    self.on('hideUi', hideUi);
    self.on('upload', upload);

    // The `hideUi` selector is the close button of the MailChimp upload popup
    $(self.config['export'].ui.selectors.hideUi).add(self.$closeBtn)
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
