var seed = (new Date()).valueOf();
function uid(){
	return seed++;
}

module.exports = uid;