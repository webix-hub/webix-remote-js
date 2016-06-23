var fetch = require("node-fetch");

function RemoteContext(url, config){
	this._proxy = {};
	this._queue = [];
	this._url = url;
	this._key = "";

	this._sync = this._sync.bind(this); 

	if (config)
		this._process(config);
	else
		this._ready = fetch(url).then((res) => res.text()).then((text) => {
			var text = text.split("/*api*/")[1];
			this._process(JSON.parse(text));
			return this._proxy;
		});
}
RemoteContext.prototype = {
	_process:function(config){
		if (config.$key)
			this._key = config.$key;
		if (config.$vars)
			for (var key in config.$vars)
				this._proxy[key] = config.$vars[key];

		this._parse(config, this._proxy, "");
	},
	_parse:function(api, obj, prefix){
		for (var key in api){
			var val = api[key];
			if (typeof val == "object"){
				var sub = obj[key] = {};
				this._parse(val, sub, prefix+key+".");
			} else
				obj[key] = this._proxy_call(this, prefix+key);
		}
	},
	_call:function(name, args){
		var def = this._deffer(this, name, args);
		this._queue.push(def);
		this._start_queue();
		return def;
	},
	_start_queue:function(){
		if (!this._timer)
			this._timer = setTimeout(this._run_queue.bind(this),1);
	},
	_run_queue:function(){
		var data = [], defs = this._queue;
		for (var i=0; i<this._queue.length; i++){
			var def = this._queue[i];
			data.push({ name: def.$name, args: def.$args });	
		}

		if (defs.length)
			fetch(this._url, { method:"POST", body: this._pack(data) })
				.then((res) => res.json())
				.then(function(data){
					var results = data.data;
					for (var i=0; i<results.length; i++){
						var res = results[i];
						if (results[i] && results[i].__webix_remote_error)
							throw results[i].__webix_remote_error;
						else {
							defs[i].resolve(res);
						}
					}		
				}).catch(function(data){
					for (var i=0; i<data.length; i++)
						defs[i].reject(data);
				});

		this._queue = [];
		this._timer = null;
	},
	_sync:function(df){
		webix.ajax().sync().post(this._url, this._pack({ name:df.name, args: df.args }));
	},
	_deffer:function(master, name, args){
		var rs, rj;
		var pr = new Promise(function(a,b){
			rs = a;
			rj = b;
		});

		pr.resolve = rs;
		pr.reject = rj;
		pr.sync = master._sync;
		pr.$name = name;
		pr.$args = args;

		return pr;
	},
	_proxy_call:function(master, name){
		return function(){
			return master._call(name, [].slice.call(arguments));
		}
	},
	_getProxy:function(){
		return this._ready || this._proxy;
	},
	_pack:function(obj){
		var str = [];
		str.push("key="+encodeURIComponent(this._key));
		str.push("payload="+encodeURIComponent(JSON.stringify(obj)));
		return str.join("&");
	}
}

function getApi(url, config){
	var ctx = new RemoteContext(url, config);
	return ctx._getProxy();
}

module.exports = getApi;
