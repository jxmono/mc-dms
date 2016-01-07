module.exports = function () {
    var self = this;

    self.on('showMailchimpUi', showMailchimpUi);
    self.on('hideUi', hideUi);
};

function showMailchimpUi () {
    var self = this;
    $(self.config['export'].ui.selectors.target).fadeIn(100);
}

function hideUi () {
    var self = this;
    $(self.config['export'].ui.selectors.target).fadeOut(100);
}
