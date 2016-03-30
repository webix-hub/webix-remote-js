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
	addRecursive:function(config, name, handler, access){
		if (typeof handler === "object"){
			var subconf = config[name] = config[name] || {};
			for (var key in handler)
				this.addRecursive(subconf, key, handler[key], access);
		} else if (typeof handler === "function"){
			config[name] = { ":api":true, access: access, handler: handler };
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

		this.addRecursive(this.methods, name, handler, access);	
	},

	createFacade:function(handler, filter){
		var obj = { $source: handler };

		if (filter.$sequelize){
			for (var key in handler)
				if (handler.hasOwnProperty(key) && key != "DAO" && key != "Instance")
					obj[key] = handler[key];
		} else {
			for (var key in filter){
				if (handler[key])
					obj[key] = handler[key];
			}
		}

		return obj;
	},

	generateApi:function(data, csrfkey, obj){
		//TODO - caching

		let api = {};

		if (!obj){
			//top level call
			obj = this.methods;
			for (let key in this.vars){
				let value = this.vars[key];
				api[key] = typeof value == "function" ? value(data) : value;
			}
		}

		if (csrfkey)
			api.$key = csrfkey;

		for (let key in obj){
			if (obj.hasOwnProperty(key)){
				let handler = obj[key];
				if (!handler[":api"])
					api[key] = this.generateApi(data, null, handler);
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
		if (typeof access == "function"){
			callback = access;
			access = null;
		}
		access = access || { "all" : true };

		var method = this.getMethod(name, access);
		if (!method) throw new Error("Method not found: "+name);

		return new Promise(function(resolve, reject){
			//console.log("Remote, call :"+name);
			resolve(method.handler.apply(context, args));
		});
	}
}

module.exports = rpc;
