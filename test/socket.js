var expect = require("chai").expect;
var assert = require("chai").assert;

var remote, client;
var lib = require("../index.js");

describe("Webix Remote", ()=>{
	before( () => {
		remote = lib.server({
			socket: { port: 9002, url:"ws://127.0.0.1:9002/" },
			log:true
		});
		remote.setMethod("test", (a,b) => a+b );
		remote.setMethod("obj", { 
			a : (a,b) => a*b,
			c : () => { throw new Error (); }
		});
		remote.setSlot("newData");
		remote.setData("user", 1)

		client = lib.client("",remote.api.generateApi());
	});

	describe("Server sockets", ()=>{
		it("Client must connect to the server", () => {
			return client.test(1,2).then((data) => expect(data).to.be.equal(3));
		});
		it("Must include socket url and slots in API", ()=>{
			expect(remote.api.generateApi()).to.be.deep.equal({
				"$slots": {	"newData": 1 },
				"$vars":{"user":1},
				"$socket":"ws://127.0.0.1:9002/",
				"test":1,
				"obj": {"a":1,"c":1}
			});
		});
		it("Must support setSlot method", ()=>{
			expect(remote.setSlot).to.be.a("function");
			expect(remote.api).to.be.an("object");
			expect(remote.trigger).to.be.a("function");
		});

		it("Triggers must work", function(done){
			var count = 0;
			setTimeout(function(){
				expect(count).to.equal(1);
				done();
			},100);

			var id = client.newData.attach((a,b) => {
				count++;
				expect(a).to.equal(1);
				expect(b).to.equal(2);

				if (count === 1){
					client.newData.detach(id);
					remote.trigger("newData", [1,2]);
				}
			});
			remote.trigger("newData", [1,2]);
		});

		it("Must process error", ()=>{
			return client.obj.c(3,4).catch((obj)=>{
				expect(obj).to.equal("Error");
			});
		});
	});

});