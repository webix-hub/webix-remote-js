const fetch = require("node-fetch");
const browser = require("./browser");


function getApi(url, config){
	return browser({}, config, url, fetch);
}

module.exports = getApi;
