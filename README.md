Webix Remote - Nodejs
---------------------

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

api.addMethod("add", function(a,b){
	return a+b;
});

express.get("./api", api.apiHandler);
```

#### On client side

```html
<script src='./api'></script>
<script>
webix.remote.sum(1,2).then(result){
	console.log(result);
});

//or in the sync way
var sum = webix.remote.sum(1,2).sync();
</script>
```

### License

MIT