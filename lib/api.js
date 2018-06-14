/*
	config: {
		guard,


*/
class Api {
	//register("help", new Help())
	//register("help", helpMethod)
	//register("help", helpMethod)
	//registerProvider("UserInfor", (req, res) => req.post.user )
	//registerVariable("UserInfor", (req, res) => req.post.user )
	//registerConstant(name, (req, res) => req.post.user )
	//function helperMethod(page, box, /*@UserInfo*/ user){
	constructor(){
		this._providers = [];
		this._methods = {};
		this._constants = {};
		this._variables = {};
	}

	register(name, obj, config){

	}

	registerProvider(name, fetcher){

	}

	registerConstant(name, value){

	}

	registerVariable(name, handler){

	}
}