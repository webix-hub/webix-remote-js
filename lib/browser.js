// code written in ES5, so we can send it directly to browser
function Browser(config, master, url, fetch){
	master = master || {};

	if (!url){
		var scs = document.getElementsByTagName("script");
		var url = scs[scs.length-1].getAttribute("src");
		scs = null;
	}

	var queue = [];
	var seed = 1;
	var csrf = config.key;
	
	master.data = master.data||{};
	master.api = master.api||{};
	master.version = config.version;
	for (var key in config.data)
		master.data[key] = config.data[key];
	for (var key in config.api){
		var obj = {};
		var cfg = config.api[key];
		for (var method in cfg)
			obj[method] = wrapper(key+"."+method);
		master.api[key] = obj;
	}
	
	function uid(){
		return (seed++).toString();
	}
	
	function wrapper(key){
		return function(){
			var args = [].slice.call(arguments);
			return new Promise(function(resolve, reject){
				queue.push({
					data:{
						id:uid(),
						name:key,
						args: args
					},
					status:"new",
					resolve:resolve,
					reject:reject
				});
				setTimeout(send, 1);
			});
		};
	}
	
	function send(name, args){
		var pack = queue.filter(function(obj){ return obj.status === "new"; }).map(function(obj){
			obj.status = "wait";
			return obj.data
		});
		if (!pack.length) return;
		
		var headers = {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
			"Remote-CSRF": csrf
		};
		var data = window.fetch ? 
			fetch(url, {
				method: "POST",
				credentials: "include",
				headers:headers,
				body:JSON.stringify(pack)
			})
			: 
			webix.ajax()
				.headers(headers)
				.post(url, JSON.stringify(pack))
				.then(function(obj){
					parseData(obj.json(), pack);
				});

		data["catch"](function(){ return false; }).then(function(res){ 
			if (res && res.ok){
				res.json().then(function(data){ parseData(data, pack); });
			} else {
				parseData(false, pack);
			}
		});
	}
	function parseData(data, pack){
		var all = {};
		if (!data){
			for (var i=0; i<pack.length; i++)
				all[pack[i].id] = { error:"Network Error" };
		} else {
			for (var i=0; i<data.length; i++)
				all[data[i].id] = data[i];
		}
		result(queue, all);
	}
	
	function result(queue, all){
		for (var i=queue.length-1; i>=0; i--){
			var test = queue[i];
			var check = all[test.data.id];
			if (check){
				if (check.error)
					test.reject(check.error);
				else
					test.resolve(check.data);
				queue.splice(i, 1);
			}
		}
	}
	return master;
}