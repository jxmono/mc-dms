var request = require('request');
var ObjectId = require('mongodb').ObjectID;

// These are variables that are set when the `uploadToMailChimp` operation is
// called.
var apiKey, apiRoot3, apiRoot2;

// Constants used below:
var pollInterval = 2000;
var maxMsToFollowBatchSubscribeStatus = 5 * 60 * 1000; // 5 minutes

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
 * createList
 * Creates a new MailChimp list with the given name. The given name must be a
 * non-empty string, otherwise an error is given to the callback instead of
 * creating the list.
 *
 * @name createList
 * @function
 * @param {String} listName The name of the new MailChimp list.
 * @param {Function} callback The function to call after creating the list. The
 * first argument is an error or null, the second argument is the list ID of the
 * new list.
 * @return {undefined}
 */
function createList(listName, callback) {
    if (typeof listName !== 'string') {
        return callback('The list name must be a string.');
    }
    listName = listName.trim();
    if (listName.length === 0) {
        return callback('The list name must not be empty.');
    }

    var options = {
        url: apiRoot3 + '/lists',
        method: 'POST',
        json: {
            name: listName,
            contact: {
                company: 'Brigels Resort AG',
                address1: 'Via Plaun Rueun 44',
                city: 'Brigels',
                state: 'Graubünden',
                zip: '7165',
                country: 'CH',
                phone: '+41 81 920 14 00'
            },
            permission_reminder: 'You signed up for updates on our website.',
            campaign_defaults: {
                from_name: 'Pradas Resort',
                from_email: 'info@pradasresort.ch',
                subject: '',
                language: 'DE'
            },
            email_type_option: false
        },
        auth: {
            user: 'any_string',
            pass: apiKey
        }
    };

    request(options, function (error, response, body) {

        if (error || response.statusCode !== 200) {
            return callback('Failed to create MailChimp list: ' + (error ||
                        JSON.stringify(body) || 'Unknown error'));
        }

        var listId = body.id;

        // the FNAME and LNAME are already created for a new list
        addMergeField(listId, 'GENDER', 'Gender',  'text', true, function (err) {

            if (err) { return callback(err); }

            callback(null, listId);
        });
    });
}

/**
 * addMergeField
 * Creates a new merge field for an existing MailChimp list.
 *
 * @name addMergeField
 * @function
 * @param {String} listId The ID of the list to add the merge field.
 * @param {String} tag The tag of the merge field.
 * @param {String} name The name of the merge field.
 * @param {String} type The type of the merge field.
 * @param {String} isPublic Is this merge field visible in the sunbscribe form?
 * @param {String} listId The ID of the list to add the merge field.
 * @param {Function} callback The function to call after creating the list merge field.
 * @return {undefined}
 */
function addMergeField(listId, tag, name, type, isPublic, callback) {

    var options = {
        url: apiRoot3 + '/lists/' + listId + '/merge-fields',
        method: 'POST',
        json: {
            tag: tag,
            name: name,
            type: type,
            public: isPublic
        },
        auth: {
            user: 'any_string',
            pass: apiKey
        }
    };

    request(options, function (error, response, body) {

        if (error || response.statusCode !== 200) {
            return callback('Failed to add merge field "' + name + '" to the MailChimp list "' + listId + '": ' + (error || JSON.stringify(body) || 'Unknown error'));
        }

        callback(null);
    });
}

/**
 * addWebhook
 * Creates a new MailChimp list with the given name. The given name must be a
 * non-empty string, otherwise an error is given to the callback instead of
 * creating the list.
 *
 * @name addWebhook
 * @function
 * @param {String} listId The ID of the list to add the webhook.
 * @param {Function} callback The function to call after creating the list webhook.
 * @return {undefined}
 */
function addWebhook(listId, callback) {
    if (typeof listId !== 'string') {
        return callback('The list ID must be a string.');
    }

    var options = {
        url: apiRoot2 + '/lists/webhook-add',
        method: 'POST',
        json: {
            apikey: apiKey,
            id: listId,
            url: 'http://pradascrm.jillix.net/@/api/mailchimp/processWebhookRequest',
            actions: {
                unsubscribe: true,
                subscribe: false,
                profile: false,
                cleaned: false,
                upemail: false,
                campaign: false
            }
        }
    };

    request(options, function (error, response, body) {

        if (error || response.statusCode !== 200) {
            return callback('Failed to create webhook for MailChimp list "' + listId + '": ' + (error ||
                        JSON.stringify(body) || 'Unknown error'));
        }

        var webhookId = body.id;
        callback(null, webhookId);
    });
}

/**
 * batchListSubscribe
 * Subscribes one or more email addresses to a MailChimp list identified by its
 * ID.
 *
 * @name batchListSubscribe
 * @function
 * @param {String} listId The ID of the MailChimp list.
 * @param {Array} emails An array of strings representing the email addresses.
 * @param {Function} callback The function to call after doing the batch
 * subscribe request. The first and only argument is an error or null.
 * @param {Function} finishedCallback The function to call after the batch
 * subscribe operation finishes. The first and only argument is an error or
 * null. The progress of the batch operation is followed (through polling the
 * server each 2 seconds which are the current value of the `pollInterval`
 * configuration variable at the beginning of this file, for maximum 5 minutes
 * which are the current value of the `maxMsToFollowBatchSubscribeStatus`
 * configuration variable at the beginning of this file) only if this callback
 * is given.
 * @return {undefined}
 */
function batchListSubscribe(listId, subscribers, callback, finishedCallback) {
    var ops = [];
    for (var i = 0; i < subscribers.length; i++) {

        subscribers[i].name = subscribers[i].name || {};

        ops.push({
            method: 'POST',
            path: '/lists/' + listId + '/members',
            operation_id: new Date().toString() + ' ' + (i + 1),
            body: JSON.stringify({
                status: 'subscribed',
                email_address: subscribers[i].email,
                merge_fields: {
                    FNAME: subscribers[i].name.first,
                    LNAME: subscribers[i].name.last,
                    GENDER: subscribers[i].gender
                }
            })
        });
    }
    var options = {
        url: apiRoot3 + '/batches',
        method: 'POST',
        json: {
            operations: ops
        },
        auth: {
            user: 'any_string',
            pass: apiKey
        }
    };
    request(options, function (error, response, body) {
        var msPassed = 0;
        // This function polls the MailChimp server to find whether the batch
        // operation is finished or not. When it is finished, the callback is
        // called.
        function checkResponseBody(responseBody) {
            if (responseBody.status !== 'finished') {
                if (msPassed > maxMsToFollowBatchSubscribeStatus) {
                    return finishedCallback('Timeout');
                }
                setTimeout(function () {
                    msPassed += pollInterval;
                    request({
                        url: apiRoot3 + '/batches/' + body.id,
                        method: 'GET',
                        auth: {
                            user: 'any_string',
                            pass: apiKey
                        }
                    }, function (err, resp, b) {

                        if (err || resp.statusCode !== 200) {
                            return finishedCallback('Batch subscribe operation failed: ' +
                                    (err || JSON.stringify(b) || 'Unknown error'));
                        }

                        b = JSON.parse(b);
                        checkResponseBody(b);
                    });
                }, pollInterval);
            } else {
                if (responseBody.errored_operations > 0) {
                    return finishedCallback('Errors for ' +
                            responseBody.errored_operations +
                            ' email addresses');
                }
                finishedCallback(null);
            }
        }

        if (error || response.statusCode !== 200) {
            return callback('Batch subscribe operation request failed: ' +
                    (error || JSON.stringify(body) || 'Unknown error'));
        }
        callback(null);
        if (typeof finishedCallback === 'function') {
            checkResponseBody(body);
        }
    });
}

/**
 * addEmailsToNewList
 * Subscribes one or more email addresses to a new MailChimp list. This is a
 * composition of the `createList` and `batchListSubscribe` functions.
 *
 * From my tests in 13rd of January 2016, 4-5 minutes must pass until the new
 * subscribers are seen in the newly created list in the MailChimp user
 * interface after the batch operation is finished.
 * - For 1 email: 10s until the list creation and the batch subscribe operations
 *   are done. After that another 4m55s until the MailChimp UI shows the new
 *   emails in the list.
 * - For 5 emails: 10s and 4m38s.
 * - For 50 emails: 14s and 4m43s.
 * - For 1000 emails: 48s and 4m16s.
 *
 * @name addEmailsToNewList
 * @function
 * @param {String} listName The name of the new MailChimp list.
 * @param {Array} emails An array of strings representing the email addresses.
 * @param {Function} callback The function to call after doing the batch
 * subscribe request. The first and only argument is an error or null.
 * @param {Function} finishedCallback The function to call after the batch
 * subscribe operation finishes. The first and only argument is an error or
 * null. The progress of the batch operation is followed (through polling the
 * server each 2 seconds which are the current value of the `pollInterval`
 * configuration variable at the beginning of this file, for maximum 5 minutes
 * which are the current value of the `maxMsToFollowBatchSubscribeStatus`
 * configuration variable at the beginning of this file) only if this callback
 * is given.
 * @return {undefined}
 */
function addEmailsToNewList(listName, emails, callback, finishedCallback) {

    if (emails.length === 0) {
        return callback('No emails given');
    }

    createList(listName, function (err, listId) {

        if (err) { return callback(err); }

        addWebhook(listId, function (err, webhookId) {

            if (err) { return callback(err); }

            batchListSubscribe(listId, emails, callback, finishedCallback);
        });
    });
}

/**
 * uploadToMailChimp
 * The actual operation that uploads to MailChimp the email addresses from the
 * `pradas_clients` template filtered by a query to a new MailChimp list. The
 * `link.data` object should have the properties `query` (an object with which
 * to filter the emails from the database) and `apiKey` (a string with the
 * MailChimp API key with which the list creation and the batch subscribe
 * operation should be done).
 *
 * @name uploadToMailChimp
 * @function
 * @param {Object} link The link object representing the current request.
 * @return {undefined}
 */
function uploadToMailChimp(link) {
    apiKey = link.params.apiKey;
    var dc = apiKey.split('-')[1];
    apiRoot3 = 'https://' + dc + '.api.mailchimp.com/3.0';
    apiRoot2 = 'https://' + dc + '.api.mailchimp.com/2.0';

    // Build the request
    var customRequest = {
        role: link.session.crudRole,
        templateId: ObjectId('5651cc754d9707687fbc7591'), // pradas_clients
        query: link.data.query,
        options: {},
        noCursor: true
    };

    // Emit the request to read the emails of the users inside the
    // `pradas_clients` template
    M.emit('crud.read', customRequest, function (err, data) {

        if (err) { link.send(500, err); return; }

        // If the second callback is given, the progress of the batch subscribe
        // operation is followed for as long as 5 minutes
        addEmailsToNewList(link.data.listName, data, function (err) {

            if (err) { return link.send(500, err); }

            link.send(200);
        }, function (err) {
            // TODO: send an email with Mandrill to the user doing the upload to
            // MailChimp regarding the status of the batch operation when it is
            // done or in maximum 5 minutes, telling the user the details of the
            // batch results.
        });
    });
}

exports.uploadToMailChimp = uploadToMailChimp;
