'use strict';
const request = require('request');
const util = require('util');
const fs = require('fs');
const winston = require('winston');
const path = require('path');
const mkdirp = require('mkdirp');
const meta = require.main.require('./src/meta');

const saveFileToLocal = async function (filename, folder, tempPath) {
    const basePath = path.join(path.resolve('.'), "./public/uploads");
	const uploadPath = path.join(basePath, folder, filename);
	console.log('basePath: ' + basePath + ' uploadPath: ' + uploadPath);
	if (!uploadPath.startsWith(basePath)) {
		throw new Error('[[error:invalid-path]]');
	}

	winston.verbose('Saving file ' + filename + ' to : ' + uploadPath);
	await mkdirp(path.dirname(uploadPath));
	await fs.promises.copyFile(tempPath, uploadPath);
	return {
		url: '/assets/uploads/' + (folder ? folder + '/' : '') + filename,
		path: uploadPath,
	};
};

const requestAsync = util.promisify((verb, options, callback) => {
	request[verb](options, function (err, res, body) {
		if (err) {
			return callback(err);
		}
		callback(null, body);
	});
});

const vimcn = module.exports;

vimcn.init = async function (params) {
	var app = params.router;
	var middleware = params.middleware;
	app.get('/admin/plugins/vimcn', middleware.admin.buildHeader, renderAdmin);
	app.get('/api/admin/plugins/vimcn', renderAdmin);
};

async function getSettings() {
	return (await meta.settings.get('vimcn') || 
	        {
				applyPostImage: meta.settings.applyPostImage == 'on', 
				applyCoverImage: meta.settings.applyCoverImage == 'off', 
				applyAvatorImage: meta.settings.applyAvatorImage == 'off', 
			});
}

async function renderAdmin(req, res, next) {
	res.render('admin/plugins/vimcn', {});
}

vimcn.uploadImage = async function (data) {
	if (!data.image) {
		throw new Error('invalid image');
	}
	var useHook = false;
	const settings = await getSettings();

	// checking img type
	if (data.uid && data.folder === 'profile') {
		if (data.image.name === 'profileAvatar') {
			useHook = settings.applyAvatorImage == 'on' ?  true : false; 
		} else if (data.image.name === 'profileCover') {
			useHook = settings.applyCoverImage == 'on' ? true : false;
		}
	}
	else{
	    useHook = settings.applyPostImage == 'on' ? true:false;
	} 
	if (useHook) {
		return await uploadVimcn(data, settings);
	}
	else{ //oringinal method
		var filename = data.image.name;
		var tempPath = data.image.path;
		var folder = data.folder;
		if (data.uid && data.folder === 'profile'){
			filename = path.parse(filename).name + "_" + data.uid.toString() 
					  + path.extname(tempPath);
		}
		else{ // non profile
			filename = path.parse(filename).name + "_"
			   + new Date().getTime().toString() + path.extname(tempPath);
			folder = path.posix.join(data.folder, data.uid.toString());
		}
		const upload = await saveFileToLocal(filename, folder, tempPath);
		return {
			url: upload.url,
			path: upload.path,
			name: filename,
		};
	}
};

async function uploadVimcn(data, settings) {
	const image = data.image;
	const type = image.url ? 'url' : 'file';
	if (type === 'file' && !image.path) {
		throw new Error('invalid image path');
	}

	let formDataImage;
	if (type === 'file') {
		formDataImage = fs.createReadStream(image.path); // stored in tmp path
		formDataImage.on('error', function (err) {});
	} else if (type === 'url') {
		formDataImage = image.url;
	} else {
		throw new Error('unknown-type');
	}
	const options = {
		url: 'https://img.vim-cn.com/',
		headers: {},
		formData: {
			type: type,
			name: formDataImage,
		},
	};
	const res = await requestAsync('post', options);

	if (res) {
		return {
			name: image.name,
			url: res,
		};
	}
	throw new Error(response.data.error.message || response.data.error);
}

vimcn.admin = {};

vimcn.admin.menu = async function (menu) {
	menu.plugins.push({
		route: '/plugins/vimcn',
		icon: 'fa-cloud-upload',
		name: 'vimcn',
	});
	return menu;
};