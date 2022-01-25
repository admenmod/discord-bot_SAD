'use strict';
let fs = require('fs');

let {
	codeShell, createPrivileges, random, JSONcopy,
	EventEmitter, Scene, Child,
	Vector2, vec2, VectorN, vecN
} = globalThis.ver;


let code_ns = globalThis.code_ns = new function() {
	const BASE_API = {
		Vector2, vec2, VectorN, vecN, EventEmitter, random, JSONcopy,
		
		setTimeout: (cb, ...args) => setTimeout(cb.bind({}), ...args), clearTimeout: clearTimeout.bind(globalThis),
		setInterval: (cb, ...args) => setInterval(cb.bind({}), ...args), clearInterval: clearInterval.bind(globalThis),
		
		Promise, Proxy, WeakRef, FinalizationRegistry,
		console, Date, Math, JSON, Set, Map, WeakSet, WeakMap,
		Object, Array, Function, Number, String, RegExp, BigInt, Symbol
	};
	
	
	let delay = (cb, time = 0, ...args) => new Promise(res => {
		let t = setTimeout(() => {
			clearTimeout(t);
			res(cb(...args));
		}, time);
	});
	
	
	const MODE_BLOB    = 0x000001;
	const MODE_TREE    = 0x000002;
	const MODE_SYMLINK = 0x000003;
	
	const MODE_EXEC    = 0x000010;
	const MODE_ROOT    = 0x000020;
	
	
	const TYPE_BLOB = 'blob';
	const TYPE_TREE = 'tree';
	
	const INDEX_MODE = 0;
	const INDEX_TYPE = 1;
	const INDEX_ID = 2;
	const INDEX_FILENAME = 3;
	
	
	let generateID = () => Number(String(Math.random()).replace('0.', '')).toString(16).padStart(14, '0');
	
	
	let Path = class {
		static _cache = [];
		static dirExp = /\/+/;
		static fileExp = /\.(?!.*\.)/;
		
		static toSource(path) {
			return typeof path === 'string' ? path : path.join('/');
		}
		
		static path(src) {
			if(typeof src !== 'string') return src;
			
			let data = src === '/' ? [''] : src.split(Path.dirExp);
			data.src = src;
			
			return data;
		}
		
		static absolute(src) {
			let path = Path.path(src);
			
			let absolute = [];
			for(let i of path) {
				if(i === '..') absolute.pop();
				else if(i === '.') continue;
				else absolute.push(i);
			};
			
			return absolute;
		}
		
		static file(src) {
			let data = {};
			
			let path = Path.path(src);
			data.filename = path[path.length-1];
			
			let [name, exp] = data.filename.split(Path.fileExp);
			data.name = name;
			data.exp = exp;
			
			return data;
		}
		
		static relative(src, dir = '') {
			src = Path.path(src);
			dir = Path.path(dir);
			
			
			let isAbsolute = src[0] === '';
			let path = isAbsolute ? [...src] : [...dir, ...src];
			let isRelative = path[0] === '.' || path[0] === '..';
			
			
			let data = Path.absolute(path);
			
			data.src = src.src;
			data.dir = dir.src;
			
			data.isRelative = isRelative;
			data.isAbsolute = isAbsolute;
			data.isDefault = data.isPassive = !(isAbsolute || isRelative);
			
			data.path = path;
			
			data.absolute = Path.toSource(data);
			data.normalize = Path.toSource(data.path);
			
			// not forget: host, port, protocol
			return data;
		}
	};
	
	/*
//	console.log(Path.absolute('root/dir/../file.js'));
	
	console.log(Path.file('../../file.sub..exe'));
	console.log(Path.relative('../../file.exe', '/root/dir'));
	console.log(Path.relative('root/dir/../file.exe'));
	
	
	console.log('//////////////////////////');
	*/
	
	
	const SAVE_STORAGE_DIR = 'fs-data/';
	
	let FileSystem = class extends EventEmitter {
		constructor(id) {
			super();
			
			if(!String(id)) throw Error('invalid id');
			
			this._id = id;
			this.rootId = generateID();
			
			let storage = null;
			
			if(FileSystem._cacheStorage[this.id]) {
				storage = FileSystem._cacheStorage[this.id];
			} else if(storage = this.getStorage()) {} else {
				storage = {};
				storage[this.rootId] = ``;
			};
			
			this._storage = storage;
			
			
			if(!FileSystem._cacheStorage[this.id]) {
				FileSystem._cacheStorage[this.id] = this._storage;
			};
		}
		
		get id() { return this._id; }
		
		getStorage() {
			let storage = null;
			
			if(fs.existsSync(SAVE_STORAGE_DIR+this.id)) {
				storage = JSON.parse(fs.readFileSync(SAVE_STORAGE_DIR+this.id, console.error));
			};
			
			return storage;
		}
		
		setStorage() {
			fs.writeFileSync(SAVE_STORAGE_DIR+this.id, JSON.stringify(this._storage));
		}
		
		getDirFiles(id) { return this._storage[id].split('\n').filter(Boolean); }
		
		getDataFile(src) {
			let path = Path.absolute(src);
			let filePath = path.splice(-1, 1)[0];
			let dirPath = path.join('/');
			
			let dirId = this.getIdByPath(dirPath);
			let fileId = this.getIdByPath(filePath);
			
			let data = null;
			let isFound = this.getDirFiles(dirId).find(i => {
				data = i.split(' ');
				return data[INDEX_FILENAME] === filename;
			});
			
			return isFound ? data : null;
		}
		
		getIdByPath(src) {
			if(src === '/') return this.rootId;
			
			let id = '';
			
			let path = Path.absolute(src).filter(Boolean);
			
			let prevDirId = this.rootId;
			let dirId = this.rootId;
			
			for(let i = 0; i < path.length; i++) {
				let filename = path[i];
				let isTarget = i === path.length-1;
				
				let files = this.getDirFiles(dirId);
				
				for(let file of files) {
					let data = file.split(' ');
					
					if(data[INDEX_FILENAME] === filename) {
						dirId = data[INDEX_ID];
						break;
					};
				};
				
				if(dirId === prevDirId) return false;
				
				prevDirId = dirId;
				
				if(isTarget) id = dirId;
			};
			
			return id;
		}
		
		removeFileSync(src, error = console.error) {
			let dirPath = Path.toSource(Path.absolute(src).path.slice(0, -1));
			
			let fileId = this.getIdByPath(src);
			let dirId = this.getIdByPath(dirPath);
			
			if(!fileId) return void error(Error(`path is empty "${Path.toSource(src)}"`));
			
			
			let files = this.getDirFiles(dirId);
			
			let l = files.findIndex(i => {
				let data = i.split(' ');
				return data[INDEX_ID] === fileId && data[INDEX_TYPE] === TYPE_BLOB;
			});
			
			if(!~l) return void error(Error(`пока что нельзя удалять директории`));
			files.splice(l, 1);
			
			this._storage[dirId] = files.join('\n');
			delete this._storage[fileId];
			
			return true;
		}
			
		removeFile(src) {
			return new Promise((res, rej) => res(this.removeFileSync(src, rej)));
		}
		
		hasFileSync(src) { return Boolean(this.getIdByPath(src)); }
		hasFile(src) {
			return new Promise((res, rej) => res(this.hasFileSync(src)));
		}
		
		readFileSync(src, error = console.error) {
			let fileId = this.getIdByPath(src);
			
			if(!fileId) return void error(Error(`file not found "${Path.toSource(src)}"`));
			return this._storage[fileId];
		}
		
		readFile(src) {
			return new Promise((res, rej) => res(this.readFileSync(src, rej)));
		}
		
		writeFileSync(src, content = '', error = console.error) {
			if(typeof content !== 'string') return void error(Error('content is not a string'));
			
			let targetId = '';
			
			let path = Path.absolute(src).filter(Boolean);
			let filename = path.splice(-1, 1)[0];
			
			if(!filename) return void error(Error(`invalid path "${Path.toSource(src)}"`));
			
			let prevDirId = this.rootId;
			let dirId = this.rootId;
			
			for(let i = 0; i < path.length; i++) {
				let filename = path[i];
				
				let files = this.getDirFiles(dirId);
				
				for(let file of files) {
					let data = file.split(' ');
					
					if(data[INDEX_FILENAME] === filename) {
						dirId = data[INDEX_ID];
						break;
					};
				};
				
				if(dirId === prevDirId) {
					dirId = generateID();
					
					this._storage[prevDirId] += FileSystem.generateFile(MODE_TREE, TYPE_TREE, dirId, filename);
					this._storage[dirId] = '';
				};
				
				prevDirId = dirId;
			};
			
			
			let blobId = generateID();
			
			this._storage[dirId] += FileSystem.generateFile(MODE_BLOB, TYPE_BLOB, blobId, filename);
			this._storage[blobId] = content;
			
			return true;
		}
		
		writeFile(src, content = '') {
			return new Promise((res, rej) => res(this.writeFileSync(src, content, rej)));
		}
		
		appendFileSync(src, content = '', error = console.error) {
			if(typeof content !== 'string') return void error(Error('content is not a string'));
			
			let dirPath = Path.toSource(Path.absolute(src).slice(0, -1));
			
			let fileId = this.getIdByPath(src);
			let dirId = this.getIdByPath(dirPath);
			
			if(!fileId) return void error(Error(`path is empty "${Path.toSource(src)}"`));
			
			
			let files = this.getDirFiles(dirId);
			let isFound = files.find(i => {
				let data = i.split(' ');
				return data[INDEX_ID] === fileId && data[INDEX_TYPE] === TYPE_BLOB;
			});
			
			if(!isFound) error(Error(`path points to a tree "${Path.toSource(src)}"`));
			
			this._storage[fileId] += content;
			
			return true;
		}
		
		appendFile(src, content = '') {
			return new Promise((res, rej) => res(this.appendFileSync(src, content, rej)));
		}
		
		
		readDirSync(src, error = console.error) {
			let res = [];
			
			let dirId = this.getIdByPath(src);
			if(!dirId) return false;
			
			
			let files = this.getDirFiles(dirId);
			
			for(let file of files) {
				let data = file.split(' ');
				res.push(data[INDEX_FILENAME]);
			};
			
			return res;
		}
		
		readDir(src, error) {
			return new Promise((res, rej) => res(this.readDirSync(src, rej)));
		}
		
		
		static generateFile(mode, type, id, filename) {
			mode = String(mode.toString(16)).padStart(6, '0');
			return `${mode} ${type} ${id} ${filename}\n`;
		}
		
		static _cacheStorage = {};
	};
	
	/*
	let fs = new FileSystem('test_fs');
	
	fs.writeFileSync('root/dir/test.txt', 'content kelsldllelsd ekekemd dekms ee');
	
	console.log(fs._storage);
	
	console.log(fs.readFileSync('root/dir/test.txt'));
	console.log(fs.appendFileSync('root/dir/test.txt', 'Addeional 929393'));
	console.log(fs.appendFileSync('root/dir/test.txt', 'Addeional 929393'));
	console.log(fs.readFileSync('root/dir/test.txt'));
	
	console.log('directory', fs.readDirSync('root'));
	
	console.log(JSONcopy(fs._storage));
	console.log(fs.removeFileSync('root/dir/test.txt'));
	console.log(JSONcopy(fs._storage));
	//*/
	
	
	
	let NameSpace = function(namespace = null) {
		return Object.create(namespace);
	};
	
	
	/*
		namespace, fs, modules;
		
		process -> (namespace);
		require -> (fs, modules);
		
		api -> (
			process -> namespace,
			require -> fs, modules
		);
		
	----------------------------------------------
		VirtulaEnv {
			this = { namespace, fs, modules };
			
			this -> (namespace, require -> (fs, modules)) => process {
				api
			} -> (api, code) => execute {
				
			};
		}
	*/
	
	
	let VirtualEnv = this.VirtualEnv = class extends EventEmitter {
		constructor(fsId = 'fs_storage', p = {}) {
			super();
			
			this.namespace = new NameSpace();
			this.namespace.PATH = '/';
			
			this.fs = new FileSystem(fsId);
			this.on('changedir', (next, prev) => this.namespace.PATH = next);
			
			
			this.debugger = new EventEmitter();
			this.debugger.console = {
				log: (...args) => this.debugger.emit('log', ...args),
				warn: (...args) => this.debugger.emit('warn', ...args),
				error: (...args) => this.debugger.emit('error', ...args)
			};
			
			this.debugger.on('log', console.log);
			this.debugger.on('warn', console.warn);
			this.debugger.on('error', console.error);
			
			
			this.coreModules = {};
			this.globalModules = {};
			this.nativeModules = {};
			
			this._appendModule('fs', global => ({ exports: this.fs, filename: 'fs' }), 'core');
			this._appendModule('path', global => ({ exports: Path, filename: 'path' }), 'core');
		}
		
		_appendModule(name, module, type) {
			return this[type+'Modules'][name] = module;
		}
		
		appendModule(name, module) { return this._appendModule(name, module, 'native'); }
		
		hasModule(path) {
			return Boolean(this.coreModules[path.src] || this.globalModules[path.src] || this.nativeModules[path.src]);
		}
		
		getModule(path) {
			return this.coreModules[path.src] || this.globalModules[path.src] || this.nativeModules[path.src];
		}
		
		createProcess(additionalApi) {
			let namespace = new NameSpace(this.namespace);
			let process = { env: namespace };
			
			
			let require = src => {
				let module = null;
				let path = Path.relative(src, this.namespace.PATH);
				src = path.absolute;
				
				if(src in require.cache) module = require.cache[src];
				else if(this.hasModule(path)) module = this.getModule(path)(api);
				else if(this.fs.hasFileSync(src)) {
					module = execute(this.fs.readFileSync(src), path);
				};
				
				if(!module) this.debugger.console.error(Error(`module "${path.src}" not found`));
				require.cache[src] = module;
				
				return module.exports || module;
			};
			require.cache = null;
			
			
			let api = {
				...additionalApi,
				
				require, process,
				
				...BASE_API,
				console: { ...this.debugger.console }
			};
			Object.defineProperty(api, 'global', { value: api });
			
			
			let execute = (code, path) => {
				let filepath = path.absolute;
				let { filename, exp } = Path.file(path);
				
				
				if(exp === 'js') {
					api.require.cache = {};
					
					api.module = {
						exports: {},
						filename
					};
					
					
					try {
						codeShell(code, api, { source: filepath }).call(api);
					} catch(err) {
						let arrStack = err.stack.split(/\n\s{4}at\s/);
						let end = arrStack.findIndex(i => i.startsWith('eval'));
						let res = arrStack.slice(0, end+1).join('\n    at ');
						
						err.stack = res;
						this.debugger.console.error(err);
					};
					
					
					return api.module;
				} else if(exp === 'json') {
					return JSON.parse(code);
				} else return code;
			};
			
			
			return execute;
		}
		
		cmd(code) {
			if(!this.cmdProcess) this.cmdProcess = this.createProcess({
				fs: this.fs,
				path: Path
			});
			
			this.cmdProcess(code, Path.relative('/cmd.js'));
		}
		
		cd(path) {
			let prev = this.namespace.PATH;
			let next = Path.relative(path, prev).absolute;
			
			this.emit('changedir', next, prev);
		}
		
		run(src) {
			let execute = this.createProcess();
			
			let path = Path.relative(src, this.namespace.PATH);
			execute(this.fs.readFileSync(path), path);
		}
	};
	
	
	/*
		VirEnv (fs_id):
			fs(fs_id)
			namespace
			globalModules: => create
		
		process (fs, namespace, globalModules):
			api: object {
				require => get module
				process: process object
			}
		
		run_file (code, api, filepath):
			execute file
	*/
	
	/*
	let virenv = new VirtualEnv('ve_test');
	
//	virenv.createExpansion('json', (code,, data) => JSON.parse(code));
	virenv.fs.writeFileSync('dd.json', '{ "fd": 30 }');
	
	virenv.fs.writeFileSync('main.js', `
	let dd = require('dd.json');
	
	console.log(dd);
	`);
	
	virenv.run('main.js');
	*/
};
