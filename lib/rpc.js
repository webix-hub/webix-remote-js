"use strict";

function rpc(){
	if (!this || !this.setData) return new rpc();
	this.methods = {};
	this.vars = {};
}

// ---
// Api generation logic
// ---
rpc.prototype = {
	getParams:function(handler){
		var str = handler.toString();
		var start = str.indexOf("(")+1;
		var end = str.indexOf(")");
		var params = str.substr(start, end-start).split(",").map((a) => a.trim());
		for (var i = 0; i < params.length; i++) {
			if (params[i] === "$req")
				return i;
		}
		return -1;
	},
	addRecursive:function(config, name, handler, owner, access){
		if (typeof handler === "object"){
			var subconf = config[name] = config[name] || {};
			for (var key in handler)
				if (key.substr(0,1) != "$")
					this.addRecursive(subconf, key, handler[key], (handler.$source || handler), access);
		} else if (typeof handler === "function"){
			var params = this.getParams(handler);
			config[name] = { ":api":true, access: access, owner: owner, handler: handler, params:params };
		}
		
	},

	setData:function(name, handler){
		this.vars[name] = handler;
	},
	setMethod:function(name, handler, filter){
		if (filter)
			handler = this.createFacade(handler, filter);

		// acess level can be defined like {user}@{method}
		var access = "all";
		if (name.indexOf("@") !== -1){
			var chunks = name.split("@");
			access = chunks[0];
			name = chunks[1];
		}

		this.addRecursive(this.methods, name, handler, null, access);	
	},

	createFacade:function(handler, filter){
		var obj = { $source: handler };

		for (var key in filter){
			if (handler[key])
				obj[key] = handler[key];
		}		

		return obj;
	},

	generateApi:function(context, csrfkey, obj){
		//TODO - caching

		let api = {};

		if (!obj){
			//top level call
			obj = this.methods;
			api.$vars = {};
			for (let key in this.vars){
				let value = this.vars[key];
				api.$vars[key] = typeof value == "function" ? value(context) : value;
			}
		}

		if (csrfkey)
			api.$key = csrfkey;

		for (let key in obj){
			if (obj.hasOwnProperty(key)){
				let handler = obj[key];
				if (!handler[":api"])
					api[key] = this.generateApi(context, null, handler);
				else
					api[key] = 1;
			}
		}

		return api;
	},


// ---
// call processing logic
// ---

	getMethod:function(name, access){
		var pointer = this.methods;
		var parts = name.split(".");
		for (var i = 0; i < parts.length; i++){
			pointer = pointer[parts[i]];
			if (!pointer) return null;
		}

		if (pointer && !access[pointer.access]) return null;
		return pointer;
	},

	runMethod:function(name, args, access, context){
		access = access || { "all" : true };
		args = args || [];
		var method = this.getMethod(name, access);
		if (!method) throw new Error("Method not found: "+name);

		return new Promise(function(resolve, reject){
			try {
				if (method.params > -1)
					args[method.params] = context;
				var res = method.handler.apply((method.owner || this), args);
				resolve(res);
			} catch(e){
				resolve({ __webix_remote_error: e.toString() });
			}
		});
	}
}

module.exports = rpc;
