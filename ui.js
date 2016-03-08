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
        errorColor: 'red',
        popupFadeAnimationDuration: 100
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
    self.on('showUi', showUi);
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

/**
 * getAutocompletedListName
 * Returns the autocompleted name of the new list. It is in the format "List
 * YYYY-MM-DD".
 *
 * @name getAutocompletedListName
 * @function
 * @return {String} The autocompleted name of the new list.
 */
function getAutocompletedListName() {
    return 'List ' + getYYYYMMDDDateString();
}

/**
 * showUi
 * Autocompletes the default list name, opens the MC popup and focuses the list
 * name input.
 *
 * @name showUi
 * @function
 * @return {undefined}
 */
function showUi () {
    var self = this;

    self.$listName.val(getAutocompletedListName());
    self.$popup.fadeIn(self.config.ui.popupFadeAnimationDuration, function () {
        self.$listName.focus();
    });
}

/**
 * hideUi
 * Hides the MC popup, resets the status of the loading indicator and of the
 * upload button.
 *
 * @name hideUi
 * @function
 * @return {undefined}
 */
function hideUi () {
    var self = this;

    self.$popup.fadeOut(self.config.ui.popupFadeAnimationDuration);
    self.$loadingIndicator.addClass('hidden')
        .css('color', '');
    // The following call only activates the Upload button, the
    // `uploadRequestInProgress` variable is already set to false at the
    // initialization of the module or at the end of the last upload request.
    setUploadActive.call(self, true);
}

/**
 * setUploadActive
 * Depending on the `state` parameter, sets the semaphore variable
 * `self.uploadRequestInProgress` and the enabled/disabled state of the upload
 * button.
 *
 * @name setUploadActive
 * @function
 * @param {Boolean} state The new state of the upload button.
 * @return {undefined}
 */
function setUploadActive (state) {
    var self = this;

    self.uploadRequestInProgress = !state;
    self.$uploadBtn.prop('disabled', self.uploadRequestInProgress);
}

/**
 * upload
 * Does the MC upload request.
 *
 * @name upload
 * @function
 * @return {undefined}
 */
function upload () {
    var self = this;

    if (!self.query) {
        alert('No data query set for upload');
        return;
    }
    self.$loadingIndicator.text('Loading...').css('color', '')
        .removeClass('hidden');
    self.$closeBtn.prop('disabled', true);
    setUploadActive.call(self, false);

    var trimmedListName = self.$listName.val().trim();
    self.$listName.val(trimmedListName);

    self.link('uploadToMailChimp', {
        data: {
            query: self.query,
            listName: trimmedListName
        }
    }, function (err) {
        self.$closeBtn.prop('disabled', false);
        if (err) {
            self.$loadingIndicator.css('color', self.config.ui.errorColor)
                .text('Error: ' + err);
            setUploadActive.call(self, true);
            self.$listName.focus();
        } else {
            self.$loadingIndicator.css('color', '')
                .text('Upload under way, it will be done in about 5 minutes. ' +
                        'You can close this window now.');
            // Here we do not call the `setUploadActive` function with the
            // `true` argument because we want only a part of its behavior
            // (After the upload request is done, the upload button remains
            // disabled until the popup is opened again):
            self.uploadRequestInProgress = false;
            self.$closeBtn.focus();
        }
    });
}

/**
 * setQuery
 * Updates the database query used to make the upload request. In the Pradas CRM
 * app this is an event handler connected to the changes of the filter in the
 * data table (the `find` event of the `data_table` MIID) through the
 * `pradas.mc_export.setFindData` function in the "/js/mc_export/handlers.js"
 * file.
 *
 * @name setQuery
 * @function
 * @param {Object} query The MongoDB database query that refers to all the
 * emails that should be uploaded to MailChimp.
 * @return {undefined}
 */
function setQuery (query) {
    var self = this;

    self.query = query;
}
