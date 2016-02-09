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
    self.config.ui = $.extend({
        errorColor: 'red'
    }, self.config.ui);
    self.config.ui.selectors = self.config.ui.selectors || {};
    self.config.ui.selectors = $.extend({
        target: '#mc_container',
        hideUi: '.close-form',
        loadingIndicator: '.loading-indicator',
        closeButton: '.close-btn',
        uploadButton: '.upload',
        listName: '.list-name'
    }, self.config.ui.selectors);

    // Cache some jQuery elements
    self.$popup = $(self.config.ui.selectors.target);
    self.$loadingIndicator = self.$popup.find(self.config.ui.selectors.
            loadingIndicator);
    self.$closeBtn = self.$popup.find(self.config.ui.selectors.closeButton);
    self.$uploadBtn = self.$popup.find(self.config.ui.selectors.uploadButton);
    self.$listName = self.$popup.find(self.config.ui.selectors.listName);
    self.$titleBarCloseBtn = self.$popup.find(self.config.ui.selectors.hideUi);

    // Set up the event handlers
    self.on('setQuery', setQuery);
    self.on('showMailChimpUi', showMailChimpUi);
    self.on('hideUi', hideUi);
    self.on('upload', upload);

    // The `hideUi` selector is the close button of the MailChimp upload popup
    self.$titleBarCloseBtn.add(self.$closeBtn)
            .on('click', function () {
        if (self.uploadRequestInProgress) { return; }

        hideUi.call(self);
    });
};

/**
 * pad
 *
 * @name pad
 * @function
 * @param {String} x A string with the length 1 or 2.
 * @return {String} `x` if it has the length 2, or `'0' + x` otherwise.
 */
function pad(x) {
    return x.length === 2 ? x : ('0' + x);
}

/**
 * getYYYYMMDDDateString
 * Returns the current date as a string in the format YYYY-MM-DD.
 *
 * @name getYYYYMMDDDateString
 * @function
 * @return {String} The current date in the format YYYY-MM-DD.
 */
function getYYYYMMDDDateString() {
    var d = new Date();
    var yyyy = d.getFullYear().toString();
    var mm = (d.getMonth() + 1).toString();
    var dd = d.getDate().toString();
    return yyyy + '.' + pad(mm) + '.' + pad(dd);
}

function getAutocompletedListName() {
    return 'List ' + getYYYYMMDDDateString();
}

function showMailChimpUi () {
    var self = this;
    self.$listName.val(getAutocompletedListName());
    self.$popup.fadeIn(100, function () {
        self.$listName.focus();
    });
}

function hideUi () {
    var self = this;
    self.$popup.fadeOut(100);
    self.$loadingIndicator.addClass('hidden')
        .css('color', '');
}

function upload () {
    var self = this;

    if (!self.query) {
        alert('No data query set for upload');
        return;
    }
    self.uploadRequestInProgress = true;
    self.$loadingIndicator.text('Loading...').css('color', '')
        .removeClass('hidden');
    self.$closeBtn.addClass('disabled');

    self.link('uploadToMailChimp', {
        data: {
            query: self.query,
            listName: self.$listName.val()
        }
    }, function (err) {
        if (err) {
            self.$loadingIndicator.css('color', self.config.ui.errorColor)
                .text('Error: ' + err);
        } else {
            self.$loadingIndicator.css('color', '')
                .text('Upload under way, it will be done in about 5 minutes. ' +
                        'You can close this window now.');
        }
        self.$closeBtn.removeClass('disabled');
        self.uploadRequestInProgress = false;
    });
}

function setQuery (query, options) {
    var self = this;

    self.query = query;
    self.queryOptions = options;
}
