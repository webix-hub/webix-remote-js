var expect = require("chai").expect;
var assert = require("chai").assert;

function error_log(err){
	if (err.message)
		console.log(err.message, err.stack);
}


describe("Webix Remote", ()=>{
	describe("Client", ()=>{
		it("Must load api config", ()=>{
			var client = require("../index.js").client("",{
                $vars:{ $key:"123", user:{ id:12 } },
                add:1,
                data:{ help:1, user:{ sub:1, ext: 1}}
            });

			expect(client.add).to.be.a("function");
			expect(client.data.help).to.be.a("function");
			expect(client.data.user.sub).to.be.an("function");
			expect(client.data.user.ext).to.be.a("function");
			expect(client.$key).to.be.equal("123");
			expect(client.user.id).to.be.equal(12);

		});

        it("Must load api url", (cb)=>{
			var server = require("../index.js").server();
            server.run("127.0.0.1","3000");
            server.setData("user", { id: 12 });
            server.setMethod("add", (a,b) => a+b )
            server.setMethod("err", () => {  throw "Test"; })
            server.setMethod("data", {
                mul: (a,b) => a*b,
                dep: {
                    max:(a,b) => Math.max(a,b)
                } 
            });

            var client = require("../index.js").client("http://127.0.0.1:3000/");
            client.then(function(api){
                expect(api.user).to.deep.equal({ id:12 });

                var sum = api.add(2,3);
                var mul = api.data.mul(2,3);
                var max = api.data.dep.max(2,3);
                var err = api.err(2,3).catch((e) => Promise.resolve("error:"+e));

                return Promise.all([sum, mul, max, err]).then((data) => {
                    [sum, mul, max, err] = data;
                    expect(sum).to.equal(5);
                    expect(mul).to.equal(6);
                    expect(max).to.equal(3);
                    expect(err).to.equal("error:Test");
                    cb();
                });
            }).catch((e) => {
                setTimeout(function(){
                    throw e;
                },1);
            })
		});
    });
});