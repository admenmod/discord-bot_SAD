'use strict';
globalThis.virenv_ns = new function() {
	let {
		NameSpace, SymbolSpace,
		codeShell, createPrivileges, random, JSONcopy,
		EventEmitter, Scene, Child,
		Vector2, vec2, VectorN, vecN
	} = globalThis.ver;
	
	
	let main = {
		symbol: new SymbolSpace(),
		access: createPrivileges({
			root: 5
		})
	};
	
	
	let PRIVATE = main.symbol('PRIVATE');
	
	
	const BASE_API = {
		NameSpace, SymbolSpace,
		Vector2, vec2, VectorN, vecN, EventEmitter, random, JSONcopy,
		
		Error,
		
		setTimeout: (cb, ...args) => setTimeout(cb.bind({}), ...args), clearTimeout: clearTimeout.bind(globalThis),
		setInterval: (cb, ...args) => setInterval(cb.bind({}), ...args), clearInterval: clearInterval.bind(globalThis),
		
		Promise, Proxy, WeakRef, FinalizationRegistry,
		console, Date, Math, JSON, Set, Map, WeakSet, WeakMap,
		Object, Array, Number, String, RegExp, BigInt, Symbol,
		
		Function: function() {
			if(main.access.present.root < 5) return function() {};
			else return new Function(...arguments);
		},
		
		ArrayBuffer, DataView, Int8Array, Uint8Array, Uint8ClampedArray,
		Int16Array, Uint16Array, Int32Array, Uint32Array,
		Float32Array, Float64Array, BigInt64Array, BigUint64Array
	};
	
	Function.prototype.constructor = BASE_API.Function;
	
	let getOwnPropertySymbols = Object.getOwnPropertySymbols;
	Object.getOwnPropertySymbols = o => {
		let arr = getOwnPropertySymbols(o);
		if(main.access.present.root < 5) return arr.filter(i => !(i === PRIVATE || o[PRIVATE].includes(i)));
		return arr;
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
	
	
	let Path = this.Path = class extends Array {
		constructor(src) {
			super();
			this.src = src;
		}
		
		get src() { return this._src; }
		set src(src) {
			this.length = 0;
			this.push(...Path.parse(src));
			
			this.isAbsolute = Path.isAbsolute(src);
			this.isRelative = Path.isRelative(src);
			this.isPassive = Path.isPassive(src);
			this.isDirectory = Path.isDirectory(src);
			
			this.input = src;
			this._src = this.toSource();
			
			this.isNormalize = Path.isNormalize(this.src);
		}
		
		toSource() { return Path.toSource(this); }
		file() { return Path.file(this); }
		
		normalize() { return Path.normalize(this, true); }
		
		valueOf() { return this.toSource(); }
		toString() { return this.toSource(); }
		[Symbol.toPrimitive]() { return this.toSource(); }
		
		
		static _cache = [];
		
		static dirExp = /\/+/;
		static fileExp = /\.(?!.*\.)/;
		
		static isAbsolute(src) { return src.startsWith('/'); }
		static isRelative(src) { return src === '.' || src === '..' || src.startsWith('./') || src.startsWith('../'); }
		static isPassive(src) { return !Path.isAbsolute(src) && !Path.isRelative(src); }
		static isDirectory(src) { return src.endsWith('/'); }
		static isNormalize(src) { return !Path.parse(src).some(i => i === '.' || i === '..'); }
		
		static parse(src) { return src.split(Path.dirExp).filter(Boolean); }
		static toPath(src) { return typeof src === 'string' ? new Path(src) : src; }
		
		static toSource(path, body = path) {
			return (path.isAbsolute ? '/':'')+body.join('/')+(body.length && path.isDirectory ? '/':'');
		}
		
		static file(src) {
			let path = Path.toPath(src);
			if(path.isDirectory) return null;
			
			let data = { dirpath: '', filename: '', name: '', exp: '' };
			
			let arr = [...path];
			data.filename = arr.pop();
			data.dirpath = Path.toSource({
				isAbsolute: path.isAbsolute,
				isDirectory: true
			}, arr);
			
			let [name, exp] = data.filename.split(Path.fileExp);
			data.name = name;
			data.exp = exp;
			
			return data;
		}
		
		static normalize(src, f = typeof src === 'string') {
			let path = Path.toPath(src);
			if(path.isNormalize) return path;
			
			let arr = [];
			for(let i of path) {
				if(i === '..') arr.pop();
				else if(i === '.') continue;
				else arr.push(i);
			};
			
			let newsrc = Path.toSource(path, arr);
			
			if(f) {
				path.src = newsrc;
				return path;
			} else return new Path(newsrc);
		}
		
	//	not forget: host, port, protocol
		static relative(...dirs) {
			let l = dirs.findIndex(src => Path.isAbsolute(src.toString()));
			dirs = dirs.slice(0, ~l ? l+1 : dirs.length).reverse();
			
			return new Path(Path.toSource({
				isAbsolute: Path.isAbsolute(dirs[0].toString()),
				isDirectory: Path.isDirectory(dirs[dirs.length-1].toString())
			}, dirs));
		}
		
		static get [Symbol.species]() { return Array; }
	};
	
	
	let FileSystem = this.FileSystem = class extends EventEmitter {
		constructor(id) {
			super();
			
			if(!String(id)) throw Error(`invalid id "${id}"`);
			
			this._id = id;
			this.rootId = generateID();
			
			if(FileSystem._cacheStorage[this.id]) {
				this._storage = FileSystem._cacheStorage[this.id];
			} else {
				this._storage = FileSystem.getcache?.(this.id) || { [this.rootId]: '' };
				
				FileSystem._cacheStorage[this.id] = this._storage;
				FileSystem.oncreate?.(this.id, this._storage);
			};
		}
		
		get id() { return this._id; }
		
		_getStorage() {}
		
	//	getJSONtoPath(src) {}
		getDirFiles(id) { return this._storage[id].split('\n').filter(Boolean).map(i => i.split(' ')); }
		
		getDataFile(src) {
			let path = Path.normalize(src);
			let { filename } = Path.file(path);
			let [fileId, dirId] = this.getIdByPath(path);
			
			return this.getDirFiles(dirId).find(file => file[INDEX_FILENAME] === filename);
		}
		
		getIdByPath(src) {
			let path = Path.normalize(src);
			
			let prevId = null;
			let nextId = this.rootId;
			
			for(let i = 0; i < path.length; i++) {
				if(nextId === null) return [nextId, prevId];
				
				prevId = nextId;
				
				let file = this.getDirFiles(nextId).find(file => file[INDEX_FILENAME] === path[i]);
				
				nextId = file ? file[INDEX_ID] : null;
			};
			
			return [nextId, prevId];
		}
		
		removeFileSync(src, error = null) {
			if(typeof error !== 'function') throw Error('no error handler passed');
			
			let path = Path.normalize(src);
			let [fileId, dirId] = this.getIdByPath(path);
			
			if(!fileId) return void error(Error(`this path does not point to anything "${src}"`));
			
			
			let files = this.getDirFiles(dirId);
			
			let l = files.findIndex(file => {
				return file[INDEX_ID] === fileId && file[INDEX_TYPE] === TYPE_BLOB;
			});
			
			if(!~l) return void error(Error(`???????? ?????? ???????????? ?????????????? ????????????????????`));
			files.splice(l, 1);
			
			this._storage[dirId] = files.forEach(i => files[i] = i.join(' ')).join('\n');
			delete this._storage[fileId];
			
			return true;
		}
		
		removeFile(src) {
			return new Promise((res, rej) => res(this.removeFileSync(src, rej)));
		}
		
		hasFileSync(src) { return Boolean(this.getIdByPath(src)[0]); }
		hasFile(src) {
			return new Promise((res, rej) => res(this.hasFileSync(src)));
		}
		
		readFileSync(src, error = null) {
			if(typeof error !== 'function') throw Error('no error handler passed');
			
			let path = Path.normalize(src);
			let [fileId, dirId] = this.getIdByPath(path);
			
			if(!fileId) return void error(Error(`this path does not point to anything "${src}"`));
			return this._storage[fileId];
		}
		
		readFile(src) {
			return new Promise((res, rej) => res(this.readFileSync(src, rej)));
		}
		
		writeFileSync(src, data = '', error = null) {
			if(typeof error !== 'function') throw Error('no error handler passed');
			if(!data || typeof data !== 'string') return void error(Error('data is not a string'));
			
			let path = Path.normalize(src);
			let [fileId, dirId] = this.getIdByPath(path);
			let { filename } = Path.file(path);
			
			if(!dirId) return void error(Error(`path does not exist "${path}"`));
			if(!filename) return void error(Error(`invalid path "${src}"`));
			
			let blobId = generateID();
			if(!fileId) {
				this._storage[dirId] += FileSystem.generateFile(MODE_BLOB, TYPE_BLOB, blobId, filename);
			};
			
			this._storage[blobId] = data;
			
			return true;
		}
		
		writeFile(src, data = '') {
			return new Promise((res, rej) => res(this.writeFileSync(src, data, rej)));
		}
		
		appendFileSync(src, data = '', error = null) {
			if(typeof error !== 'function') throw Error('no error handler passed');
			if(typeof data !== 'string') return void error(Error('data is not a string'));
			
			let path = Path.normalize(src);
			let [fileId, dirId] = this.getIdByPath(path);
			
			if(!fileId) return void error(Error(`path is empty "${src}"`));
			
			
			let files = this.getDirFiles(dirId);
			let isFound = files.some(i => {
				let data = i.split(' ');
				return data[INDEX_ID] === fileId && data[INDEX_TYPE] === TYPE_BLOB;
			});
			
			if(!isFound) error(Error(`path points to a tree "${src}"`));
			
			this._storage[fileId] += data;
			
			return true;
		}
		
		appendFile(src, data = '') {
			return new Promise((res, rej) => res(this.appendFileSync(src, data, rej)));
		}
		
		readDirSync(src, error = null) {
			if(typeof error !== 'function') throw Error('no error handler passed');
			
			let res = [];
			
			let [dirId] = this.getIdByPath(src);
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
		
		
		mkdirSync(src, error = null) {
			if(typeof error !== 'function') throw Error('no error handler passed');
			
			let path = Path.normalize(src);
			let [fileId, dirId] = this.getIdByPath(path);
			let { filename } = Path.file(path);
			
			if(fileId) return void error(Error(`cannot create directory "${src}": File exists`));
			if(!dirId) return void error(Error(`path does not exist "${path}"`));
			if(!filename) return void error(Error(`invalid path "${src}"`));
			
			let blobId = generateID();
			this._storage[dirId] += FileSystem.generateFile(MODE_TREE, TYPE_TREE, blobId, filename);
			this._storage[blobId] = '';
			
			return true;
		}
		
		mkdir(src) {
			return new Promise((res, rej) => res(this.mkdirSync(src, rej)));
		}
		
		
		static generateFile(mode, type, id, filename) {
			mode = String(mode.toString(16)).padStart(6, '0');
			return `${mode} ${type} ${id} ${filename}\n`;
		}
		
		static oncreate = null;
		static getcache = null;
		static _cacheStorage = {};
	};
	
	
	let Debugger = this.Debugger = class extends EventEmitter {
		constructor(_console = console) {
			super();
			this.console = {
				log: (...args) => {
					_console.log(...args);
					this.emit('log', ...args);
				},
				warn: (...args) => {
					_console.warn(...args);
					this.emit('warn', ...args);
				},
				error: (...args) => {
					_console.error(...args);
					this.emit('error', ...args);
				},
			};
		}
	};
	
	
	let executeCode = this.executeCode = (code, api, p = {}) => {
		try {
			main.access.addPrivilege(codeShell(code, api, p), {
				root: 1
			}).call(api);
		} catch(err) {
			let arrStack = err.stack.split(/\n\s{4}at\s/);
			let end = arrStack.findIndex(i => i.startsWith('eval'));
			let res = arrStack.slice(0, end + 1).join('\n    at ');
			
			err.stack = res;
			
			if(p.debugger) p.debugger.console.error(err);
			else console.error(err);
		};
	};
	
	
	let VirtualEnv = this.VirtualEnv = class extends EventEmitter {
		constructor(fsId = 'fs_storage', p = {}) {
			super();
			
			this.namespace = new NameSpace();
			this.namespace.PATH = '/';
			
			this.fs = new FileSystem(fsId);
			this.on('changedir', (next, prev) => this.namespace.PATH = `${next}`);
			
			this.rootpath = new Path(this.namespace.PATH);
			this.currentPath = new Path(this.namespace.PATH);
			
			this.debugger = p.debugger || new Debugger(console);
			
			
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
			return Boolean(this.coreModules[path] || this.globalModules[path] || this.nativeModules[path]);
		}
		
		getModule(path) {
			return this.coreModules[path] || this.globalModules[path] || this.nativeModules[path];
		}
		
		createProcess(additionalApi = {}) {
			let execPath = new Path(this.currentPath.toString());
			
			let process = {
				env: new NameSpace(this.namespace),
				filename: execPath.toString()
			};
			
			
			let require = (src, dir = '') => {
				let module = null;
				let path = Path.relative(src, dir);
				
				if(api.require.cache[path]) module = api.require.cache[path];
				else if(module = this.getModule(src)) module = module(api);
				else if(this.fs.hasFileSync(path)) module = execute(path);
				
				if(!module) this.debugger.console.error(Error(`module "${path}" not found`));
				api.require.cache[path] = module;
				
				return module.exports || module;
			};
			
			
			let api = {
				...additionalApi,
				
				process,
				
				...BASE_API,
				console: this.debugger.console
			};
			Object.defineProperty(api, 'global', { value: api });
			
			
			let execute = src => {
				let path = Path.relative(src, execPath, this.currentPath).normalize();
				if(path.isDirectory) return void this.debugger.console.error(Error(`directory cannot be executed "${path}"`));
				
				let { dirpath, exp } = Path.file(path);
				
				let code = this.fs.readFileSync(path, this.debugger.console.error);
				
				if(exp === 'js') {
					api.require = src => require(src, dirpath);
					api.require.cache = {};
					
					api.module = {
						exports: {},
						filename: path.toString()
					};
					
					executeCode(code, api, {
						source: path.toString(),
						debugger: this.debugger
					});
					
					return api.module;
				} else if(exp === 'json') return JSON.parse(code);
				
				return code;
			};
			
			
			return execute;
		}
		
		cmd(code) {
			if(this.env_global) return executeCode(code, this.env_global, {
				source: 'console',
				debugger: this.debugger
			});
			
			this.env_global = {
				Path, fs: this.fs,
				
				cd: (...args) => this.cd(...args),
				run: (...args) => this.run(...args),
				
				env: this.namespace,
				
				...BASE_API,
				
				console: this.debugger.console
			};
			Object.defineProperty(this.env_global, 'global', { value: this.env_global });
			
			this.cmd(code);
		}
		
		cd(path) {
			let prev = this.currentPath.toString();
			let next = Path.relative(path, this.currentPath).normalize().toString();
			
			this.currentPath.src = next;
			this.emit('changedir', next, prev);
		}
		
		run(src) {
			let execute = this.createProcess();
			
			execute(src);
		}
	};
};
