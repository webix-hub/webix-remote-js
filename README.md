Webix Remote - Nodejs
---------------------


[![Build Status](https://travis-ci.org/webix-hub/webix-remote-js.svg?branch=master)](https://travis-ci.org/webix-hub/webix-remote-js)
[![npm version](https://badge.fury.io/js/webix-remote.svg)](https://badge.fury.io/js/webix-remote)
[![Join the chat at https://gitter.im/webix-hub/webix](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/webix-hub/webix) 


Simple RPC for NodeJS and Webix UI


### How to install

```
npm install webix-remote
```

### How to use

#### On server side
```js
var remote = require("webix-remote");
var api = remote.server();

api.setMethod("add", function(a,b){
	return a+b;
});

api.setMethod("helpers", {
	add: (a,b) => a+b,
	mul: (a,b) => a*b
});

express.use("/api", api.express());
```

#### On client side

```html
<script src='/api'></script>
<script>
webix.remote.sum(1,2).then(result){
	console.log(result);
});

//or in the sync way
var sum = webix.remote.sum(1,2).sync();
</script>
```

#### Special parameters

- $req - request object

```js
api.setMethod("add", function(a,b,$req){
	return a+b+$req.session.userBonus;
});
//on client - webix.remote.add(1,2);
```

#### Adding static data

You can define some static data which will be available on client side. It is a good place for session data, which need to be shared with a client-side code.

Warning - the data generation method will be called only once, during the api initialization. 

```js
//server
api.setData("$user", function($req){
	return $req.user.id;
});

//client
var user = webix.remote.$user;
```

#### API access levels

You can limit api to user's with defined access level. 

```js
//only user with 'admin' role will be able to call the method
api.setMethod("admin@add", function(a,b){
	return a+b;
});
```

Access level is defined in next way

- all methods withouth access modificator is allowed by default
- if req.session.user exists, methods with "user" modificator is allowed
- if req.session.user.role exists, methods with role modification is allowed

```js
//req.session = { user: { role:"admin,levelB"}}

api.setMethod("user@add1", (a,b) => a+b ); //allowed
api.setMethod("admin@add2", (a,b) => a+b ); //allowed
api.setMethod("levelC@add3", (a,b) => a+b ); //blocked
```

You can define your custom logic though

```js
api.$access = function(){
	return { 
		user : !!req.user,
		admin: req.user && req.user.id == 1 
	};
};
```

### License

MIT
