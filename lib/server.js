const chalk = require('chalk');

class Server(){
	consructor(config){
		this.config = config;
		this.api = require("./rpc.js")()
	}

	express(){
		return (req, res, next) => {
			if (req.method === "GET" )
				this.apiHandler(req, res);
			else if (req.method === "POST")
				this.callHandler(req, res);
			else
				next();
		};
	}

	apiHandler(req, res){
		var api = this.api.generateApi(req, this.getCSRFKey(req));
		res.send("webix.remote(/*api*/"+JSON.stringify(api)+"/*api*/);");
	}

	callHandler(req, res){
		if (this.checkCSRF(req)){
			const result = this.multicall(req.body.payload, req);
			return result.then((data) => this.returnData(res, data))
				.catch((err) => this.returnError(res, err));
		} else {
			return this.returnError(res, "CSRF detected");
		}
	}

	runMethod(name, data, req){
		//get access level of current call
		var access = { "all":true };

		var session = req.session;
		if (session && session.user){
			access.user = true;

			if (session.user.role){
				var roles = session.user.role.split(",");
				for (var i = 0; i < roles.length; i++)
					access[roles[i]] = true;
			}
		}

		if (this.$access) 
			access = this.$access(req, access) || { };

		if (this.config.log)
			console.log(chalk.green(`[remote] ${name}`, data));
		return this.api.runMethod(name, data, access, req);
	}
	setMethod(name, functor, filter){
		return this.api.setMethod(name, functor, filter);
	}
	setData(name, value){
		return this.api.setData(name, value);
	}


	checkCSRF(req){
		if (!req.session){
			//it seems the app doesn't use sessions at all
			return true;
		}

		if (req.body.key && req.body.key === req.session.csrfkey)
			return true;
		return false;
	}

	getCSRFKey(req){
		var session = req.session;
		if (session){
			if (!session.csrfkey)
				session.csrfkey = require('crypto').randomBytes(8).toString("hex");

			return session.csrfkey;
		}
	}



	multicall(str, req){
		return new Promise((resolve, reject) => {
			const data = JSON.parse(str);
			const result = [];

			for (let i = 0; i < data.length; i++){
				result[i] = this.runMethod(data[i].name, data[i].args, req).catch((e) => {
					return Promise.resolve({
						__webix_remote_error : e.toString() 
					});
				});
			}

			Promise.all(result).then(resolve, reject);
		});
	}

	returnData(res, data){
		res.status(200);
		res.json({ data:data });
		return data;
	}

	returnError(res, error){
		if (!this.config.ignoreError){
			var message;
			if (error && typeof error == "object")
				message = error.message;
			else
				message = error;

			if (this.config.log)
				console.log(chalk.red(`[remote] [error] ${message}`));

			res.status(500);
			res.json({ error:message });
		}

		return Promise.reject(error);
	}

	run(host, port){
		var http = require('http');
		var express = this.express();
		http.createServer((req, res) => {

			res.send = function(data){
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.write(data);
				res.end();
			};
			res.json = function(data){
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.write(JSON.stringify(data));
				res.end();
			};
			res.status = function(){
				res.writeHead(500);
			};

			var body = [];

			req.on('data', function(chunk) {
				body.push(chunk);
			}).on('end', function() {
				req.body = require('querystring').parse(Buffer.concat(body).toString());

				express(req, res, function(req, res){
					res.writeHead(500, {'Content-Type': 'text/plain'});
					res.end('Not Supported');
				});
			});
		}).listen(port, host);

		if (this.config.logs)
			console.log(`Webix Remote server at ${host}:${port}`);
	}
}

module.exports = function(config){
	return new Server(config);
}