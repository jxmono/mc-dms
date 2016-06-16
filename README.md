# mc-dms
MailChimp module for Mono-based DMS applications

## Usage

Configuration properties:

- `errorColor` - the CSS color used to display the error messages in the MC
  popup;
- `popupFadeAnimationDuration` - the duration of the fade in and fade out
  animations of the MC popup.

Selectors:

- `target` - the popup container;
- `hideUi` - the popup close button in the top-right side;
- `loadingIndicator` - the element in the popup that displays the status of the
  upload request;
- `closeButton` - the Close button at the bottom-right side of the popup;
- `uploadButton` - the selector of the Upload button at the bottom of the popup;
- `listName` - the input element used for entering the name of the new list.

This is an example configuration of an instance of this module inside the
application.json of a Mono application. The values of the properties inside the
`config.ui` object are set to their default values, so they can be omitted.

```json
{
    "module": "github/jxmono/mc-dms/dev",
    "roles": [1],
    "config": {
        "html": {
            "de": "/html/data/mailchimp.de.html",
            "fr": "/html/data/mailchimp.fr.html",
            "it": "/html/data/mailchimp.it.html"
        },
        "waitFor": ["crud", "data_filter"],
        "scripts": [
            "/js/mc_export/handlers.js"
        ],
        "ui": {
            "errorColor": "#AF0E1B",
            "popupFadeAnimationDuration": 100,
            "selectors": {
                "target": "#mc_container",
                "hideUi": ".close-form",
                "loadingIndicator": ".loading-indicator",
                "closeButton": ".close-btn",
                "uploadButton": ".upload",
                "listName": ".list-name"
            }
        },
        "binds": [
            {
                "target": ".upload",
                "on": [{
                    "name": "click",
                    "emit": "upload",
                    "noEvent": true
                }]
            }
        ],
        "listen": {
            "data_filter": {
                "find": [
                    { "handler": "pradas.mc_export.setFindData" }
                ]
            },
            "layout_data_actions": {
                "<The event emitted when pressing the Upload to MailChimp button>": [
                    { "emit": "showUi" }
                ]
            }
        }
    },
    "operations": {
        "uploadToMailChimp": {
            "roles": [1],
            "params": [
                {
                    "apiKey": "<MailChimp API key here>"
                }
            ]
        }
    }
}
```

## Changelog

### `v0.2.0`
 - Added first name, last name and gender merge fields and data to the MailChimp lists.

### `v0.1.0`
 - Initial release.
