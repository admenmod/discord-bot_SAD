const fs = require('fs');
const path = require('path');

const DiscordJS = require('discord.js');
const database = require('./modules/database.js');
const config = require('./config.json');

//require('./ver.js');
//let { codeShell, JSONcopy } = Ver;


// config.cfg.intents = new DiscordJS.Intents(config.cfg.intents);
// const client = new DiscordJS.Client(config.cfg);
const client = new DiscordJS.Client(/*{ intents: [DiscordJS.Intents.FLAGS.GUILDS] }*/);

// let db;
// database.read(data => db = data);


/*
function codeShell(code = '', useAPI = {}, file = 'code') {
	let proxyUseAPI = new Proxy(useAPI, {
		has: t => true,
		get: (target, key) => key === Symbol.unscopables ? undefined : target[key]
	});
	
	if(typeof code !== 'string') code = code.toString().replace(/^function.+?\{(.*)\}$/s, '$1');
	return function() { eval(`with(proxyUseAPI) {${code}}; //# sourceURL=${file}`); };
};*/

/*
let useAPI = {
	log: console.log, $: {},
	get db() {
		let d = JSONcopy(db);
		delete d.avtorization;
		return d;
	},
	
	Promise, Proxy, WeakRef,
	console, Date, Math, JSON, Set, Map, WeakSet, WeakMap,
	Object, Array, Function, Number, String, RegExp, BigInt, Symbol
};
*/

client.on('ready', () => {
	console.log('=== Bot loaded ===');
});

client.on('message', message => {
	try {
	if(message.author.bot || message.channel.type === 'dm') return;
	
	let user = message.author;
	let text = message.content;
	
	console.log(text);
	
	if(!text.startsWith(config.prefix)) return;
	text = text.replace(/^>/, '');
	let arr = text.split(/ +/);
	
	/*
	let profile = db.profiles.find(i => i.id === user.id);
	if(!profile) {
		db.profiles.push(profile = {
			id: user.id,
			name: user.username
		});
	};
	*/
//	console.log(db);
//	database.write(db);
	
	
	if(arr[0] === 'code', 0) {
		useAPI.log = v => {
			if(v) message.channel.send(JSON.stringify(v, null, '\t') || 'undefined');
			return v;
		};
		
		console.log(text);
		
		
		let arg = text.replace(/^>code(?: +)/, '');
	//	codeShell(`log(${arg})`, useAPI).call(useAPI);
	} else if(arr[0] === 's' && arr[1]) {
		let input = arr[1];
		let res = '';
		
		[
			'Mk5 aaabbc ggg',
			'mk5 aabccc gg o'
		].filter(i => ~i.toLowerCase().search(input.toLowerCase())).forEach(i => res += i+'\n');
		
		
		message.channel.send(res);
	} else if(arr[0].toLowerCase() === 'invitelink') {
		client.generateInvite(['ADMINISTRATOR']).then(console.log);
	} else if(arr[0] === '>menu') {
		const menuEmbed = new DiscordJS.MessageEmbed()
			.setTitle("Menu")
			.addFields(
				{ name: "1.", value: "Time in NY"},
				{ name: "2.", value: "Movies currently running"},
				{ name: "3.", value: "Sports News"}
			);
			
		message.channel.send(menuEmbed).then(() => {
			const filter = (user) => {
				return user.author.id === message.author.id //only collects messages from the user who sent the command
			};
			
			message.channel.awaitMessages(filter, { max: 1, time: 15000, errors: ['time'] })
				.then(collected => {
					let choice = collected.first().content; //takes user input and saves it
				})
				.catch(e => {
					return message.channel.send(`:x: Setup cancelled - 0 messages were collected in the time limit, please try again`)
						.then(m => {
							console.log(m);
							m.delete({ timeout: 4000 });
						});
				});		
		});
	};
	
	} catch(err) { console.log(err); };
});

client.login(process.env.TOKEN);
console.log('loading...');




/*
MessageEmbed {
	type: 'rich',
	title: null,
	description: null,
	url: null,
	color: null,
	timestamp: null,
	fields: [],
	thumbnail: null,
	image: null,
	video: null,
	author: null,
	provider: null,
	footer: null,
	files: []
}
*/