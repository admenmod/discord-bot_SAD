const fs = require('fs');
const path = require('path');

require('./ver.js');

let {
	createPrivileges, random, JSONcopy,
	EventEmitter, Scene, Child,
	Vector2, vec2, VectorN, vecN
} = globalThis.ver;

require('./ns_objects/code_ns.js');
let { VirtualEnv } = code_ns;

const DiscordJS = require('discord.js');
const client = new DiscordJS.Client();

const config = require('./config.json');


client.on('ready', () => console.log('=== Bot loaded ==='));


let virenv = new VirtualEnv('main');

let bot_module = {};
virenv.appendModule('bot', api => ({ exports: bot_module, filename: 'bot' }));

virenv.debugger.off('error').on('error', (...args) => {
	console.error('\x1b[31m', ...args, '\x1b[0m');
	bot_module.send('```js\n'+args[0].stack+'\n```');
});


let handler = new EventEmitter();

handler.on('cmd', (message, args) => {
	let text = message.content;
	text = text.replace(/^>cmd\s+/, ''); 
	
	console.log('code: ', `"${text}"`);
	if(!text) return;
	
	let send_ = text => message.channel.send(text);
	bot_module.send = send_;
	
	virenv.cmd(text);
});

handler.on('run', (message, args) => {
	if(!argd[1]) return;
	
	virenv.run(args[1]);
});


handler.on('s', (message, arr) => {
	if(!arr[1]) return;
	
	let input = arr[1];
	let res = '';
	
	[
		'Mk5 aaabbc ggg',
		'mk5 aabccc gg o'
	].filter(i => ~i.toLowerCase().search(input.toLowerCase())).forEach(i => res += i+'\n');
	
	message.channel.send(res);
});


client.on('message', message => {
	try {
	if(message.author.bot || message.channel.type === 'dm') return;
	
	let user = message.author;
	let text = message.content;
	
	
	console.log('\x1b[33m%s\x1b[0m', text);
	
	if(!text.startsWith(config.prefix)) return;
	text = text.replace(/^>/, '');
	let arr = text.split(/ +/);
	
	handler.emit(arr[0], message, arr);
	
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