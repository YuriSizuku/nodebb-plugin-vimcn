'use strict';
/* globals $, app */

define('admin/plugins/vimcn', ['settings'], function(Settings) {
	var ACP = {};
	ACP.init = function() {
		Settings.load('vimcn', $('.vimcn-settings'));
		$('#save').on('click', function() {
			Settings.save('vimcn', $('.vimcn-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'vimcn-saved',
					title: 'Settings Saved',
					message: 'vimcn settings saved'
				});
			});
		});
	};
	return ACP;
});