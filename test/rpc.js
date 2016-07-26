var expect = require("chai").expect;
var assert = require("chai").assert;

var rpc = require("../lib/rpc.js");

describe("Webix Remote", ()=>{
	describe("Server side - API generation", ()=>{
		it("Must generate empty API by default", ()=>{
			var server = rpc();
			var api = server.generateApi();
			expect(api).to.be.deep.equal({ $vars:{} });
		});
		it("Must provide csrf key", ()=>{
			var server = rpc();
			var api = server.generateApi(null, "123");
			expect(api).to.be.deep.equal({ $vars:{}, $key: "123" });
		});
		it("Must provide method map", ()=>{
			var server = rpc();
			server.setMethod("testA", function(){});
			server.setMethod("testB", {
				one:function(){},
				two:{
					a:function(){},
					b:1
				},
				three:1
			});

			var api = server.generateApi();
			expect(api).to.be.deep.equal({ $vars:{}, testA:1, testB:{
				one:1, two: { a: 1 }
			}});
		});
		it("Must store global data", ()=>{
			var server = rpc();
			server.setData("a", "123");
			server.setData("b", function(){ return "321"; });
			server.setData("c", function(a){ return a; });

			var api = server.generateApi("111");
			expect(api).to.be.deep.equal({ $vars:{ a: "123", b:"321", c:"111" }});
		});
	});

	describe("Server side - API calls",() => {
		it("Must call method and receive data", ()=>{
			var server = rpc();
			server.setMethod("testA", function(){ return 1; });
			return server.runMethod("testA").then((res) => 
				expect(res).to.be.equal(1));
		});

		it("Must call method and receive promise of data", ()=>{
			var server = rpc();
			server.setMethod("testA", () => 
				new Promise((resolve) => resolve(2) ));

			return server.runMethod("testA").then((res) => 
				expect(res).to.be.equal(2));
		});

		it("Must call nested methods", ()=>{
			var server = rpc();
			server.setMethod("testA", { a: function(){ return 3; }});
			return server.runMethod("testA.a").then((res) => 
				expect(res).to.be.equal(3) );
		});
	});
});