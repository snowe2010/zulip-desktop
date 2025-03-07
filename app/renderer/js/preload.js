'use strict';

const { ipcRenderer, shell } = require('electron');
const SetupSpellChecker = require('./spellchecker');

const LinkUtil = require(__dirname + '/utils/link-util.js');
const params = require(__dirname + '/utils/params-util.js');

// eslint-disable-next-line import/no-unassigned-import
require('./notification');

// Prevent drag and drop event in main process which prevents remote code executaion
require(__dirname + '/shared/preventdrag.js');

// eslint-disable-next-line camelcase
window.electron_bridge = require('./electron-bridge');

const logout = () => {
	// Create the menu for the below
	document.querySelector('.dropdown-toggle').click();

	const nodes = document.querySelectorAll('.dropdown-menu li:last-child a');
	nodes[nodes.length - 1].click();
};

const shortcut = () => {
	// Create the menu for the below
	const node = document.querySelector('a[data-overlay-trigger=keyboard-shortcuts]');
	// Additional check
	if (node.text.trim().toLowerCase() === 'keyboard shortcuts (?)') {
		node.click();
	} else {
		// Atleast click the dropdown
		document.querySelector('.dropdown-toggle').click();
	}
};

process.once('loaded', () => {
	global.logout = logout;
	global.shortcut = shortcut;
});

// To prevent failing this script on linux we need to load it after the document loaded
document.addEventListener('DOMContentLoaded', () => {
	if (params.isPageParams()) {
	// Get the default language of the server
		const serverLanguage = page_params.default_language; // eslint-disable-line no-undef, camelcase
		if (serverLanguage) {
			// Init spellchecker
			SetupSpellChecker.init(serverLanguage);
		}
		// redirect users to network troubleshooting page
		const getRestartButton = document.querySelector('.restart_get_events_button');
		if (getRestartButton) {
			getRestartButton.addEventListener('click', () => {
				ipcRenderer.send('forward-message', 'reload-viewer');
			});
		}
		// Open image attachment link in the lightbox instead of opening in the default browser
		const { $, lightbox } = window;
		$('#main_div').on('click', '.message_content p a', function (e) {
			const url = $(this).attr('href');

			if (LinkUtil.isImage(url)) {
				const $img = $(this).parent().siblings('.message_inline_image').find('img');

				// prevent the image link from opening in a new page.
				e.preventDefault();
				// prevent the message compose dialog from happening.
				e.stopPropagation();

				// Open image in the default browser if image preview is unavailable
				if (!$img[0]) {
					shell.openExternal(window.location.origin + url);
				}
				// Open image in lightbox
				lightbox.open($img);
			}
		});
	}
});

// Clean up spellchecker events after you navigate away from this page;
// otherwise, you may experience errors
window.addEventListener('beforeunload', () => {
	SetupSpellChecker.unsubscribeSpellChecker();
});

// electron's globalShortcut can cause unexpected results
// so adding the reload shortcut in the old-school way
// Zoom from numpad keys is not supported by electron, so adding it through listeners.
document.addEventListener('keydown', event => {
	if (event.code === 'F5') {
		ipcRenderer.send('forward-message', 'hard-reload');
	} else if (event.ctrlKey && event.code === 'NumpadAdd') {
		ipcRenderer.send('forward-message', 'zoomIn');
	} else if (event.ctrlKey && event.code === 'NumpadSubtract') {
		ipcRenderer.send('forward-message', 'zoomOut');
	} else if (event.ctrlKey && event.code === 'Numpad0') {
		ipcRenderer.send('forward-message', 'zoomActualSize');
	}
});
