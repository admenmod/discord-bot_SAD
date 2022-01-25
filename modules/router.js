let fs = require('fs');
let url_m = require('url');
let EventEmitter = require('events');
let path_m = require('path');
let config = require('../config.json');


let extToContentType = {
	'.css': 'text/css',
	'.csv': 'text/csv',
	'.html': 'text / html',
	'.js': 'text/javascript',
	'.php': 'text/php',
	'.xml': 'text/xml',
	'.md': 'text/markdown'
};


let router = new EventEmitter();

router.direct = (req, res) => {
	if(req.method !== 'GET') return;
	
	let url = url_m.parse(req.url);
	
	let params = {
		path: config.root_path+url.pathname,
		prevented: false,
		cb: null
	};
	
	
	router.emit('intercept', {
		url,
		redirect: path => params.path = path,
		preventDefault: cb => {
			params.prevented = true;
			params.cb = cb;
		}
	});
	
	if(params.prevented) {
		if(!params.cb) return res.end();
		
		params.cb(req, res);
		return;
	};
	
	
	fs.readFile(params.path, (err, data) => {
		if(err) {
			console.log(err);
			return router.redirectTo404(req, res, url);
		};
		
		res.writeHead(200, { 'Content-Type': extToContentType[path_m.extname(params.path)] });
		res.write(data);
		res.end();
	});
};


router.redirectTo404 = (req, res, url) => {
	return fs.readFile(config.root_path + '404.html', (err, data) => {
		if(err) {
			console.log(err);
			res.end(err);
			return;
		};
		
		res.writeHead(404, { 'Content-Type': 'text/html' });
		res.write(data);
		res.end();
	});
};

module.exports = router;
