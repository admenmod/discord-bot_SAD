let fs = require('fs');
let EventEmitter = require('events');
let config = require('../config.json');

let database = Object.assign(new EventEmitter(), {
	write(obj, cb = () => {}) {
		fs.writeFile(config.database, JSON.stringify(obj), (err, data) => {
			if(err) console.log(err);
			
			cb(data);
			this.emit('write', err, data);
		});
	},
	read(cb = () => {}) {
		fs.readFile(config.database, 'utf8', (err, data) => {
			if(err) console.log(err);
			data = JSON.parse(data);
			cb(data);
			this.emit('read', data);
		});
	}
});

module.exports = database;