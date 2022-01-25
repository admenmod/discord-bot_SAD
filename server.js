/*
const fs = require('fs');
const http = require('http');
const path = require('path');
const fetch = require('node-fetch');

let config = require('./config.json');

let router = require('./modules/router.js');
let database = require('./modules/database.js');

const log = console.log;

let host = process.env.HOST,
	port = process.env.PORT;
	

router.on('intercept', e => {
	if(e.url.pathname !== '/database.json') return;
	
	e.preventDefault((req, res) => {
		fs.readFile('./database.json', (err, data) => {
			if(err) {
				console.log(err);
				return router.redirectTo404(req, res);
			};
			
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.write(data);
			res.end();
		});
	});
});

router.on('intercept', e => {
	if(e.url.pathname === '/favicon.ico') e.preventDefault();
});

router.on('intercept', e => {
	if(e.url.pathname !== '/') return;
	
	e.redirect(config.root_path+'index.html');
	
	let params = new URLSearchParams(e.url.query);
	
	if(!params.has('code')) return;
	
	fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		body: new URLSearchParams({
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET,
			code: params.get('code'),
			grant_type: 'authorization_code',
			redirect_uri: `http://${host}:${port}`,
			scope: 'identify',
		}),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	})
	.then(data => data.json())
	.then(oauthData => {
		log(oauthData);
		
		database.read(db => {
			if(oauthData.error) return;
			
			let av = db.avtorization.find(i => i.access_token === oauthData.access_token);
			if(!av) db.avtorization.push(av = oauthData);
			
			database.write(db);
		});
		
		
		fetch('https://discord.com/api/users/@me', {
			headers: {
				authorization: `${oauthData.token_type} ${oauthData.access_token}`
			}
		})
		.then(data => data.json())
		.then(userData => {
			log(userData);
			
			database.read(db => {
				if(!userData.id) return;
				
				let profile = db.profiles.find(i => i.id === userData.id);
				if(!profile) db.profiles.push(profile = userData);
				
				database.write(db);
			});
		});
	});
});


let server = http.createServer((req, res) => {
	log(req.url);
	
	router.direct(req, res);
});


server.listen(port, host, () => {
	log(`http://${host}:${port}`);
});
*/