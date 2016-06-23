var expect = require("chai").expect;
var assert = require("chai").assert;

var remote;

function res_mock(check, status){
	return {
		send:function(data){
			expect(data).to.be.equal(check);
		},
		json:function(data){
			expect(data).to.be.deep.equal(check);
		},
		status:function(data){
			expect(data).to.be.equal(status);
		}
	};
};

function req_mock(body, session){
	return {
		body, session
	};
};

function error_log(err){
	if (err.message)
		console.log(err.message, err.stack);
}


describe("Webix Remote", ()=>{
	before( () => {
		remote = require("../index.js").server();
		remote.setMethod("test", (a,b) => a+b );
		remote.setMethod("obj", { 
			a : (a,b) => a*b,
			c : () => { throw new Error (); }
		});
		remote.setData("user", 1)
	});

	describe("Server side - call processing", ()=>{
		it("Must generate API on request", ()=>{
			remote.apiHandler(
				req_mock(),
				res_mock("webix.remote(/*api*/{\"$vars\":{\"user\":1},\"test\":1,\"obj\":{\"a\":1,\"c\":1}}/*api*/);")
			);
		});
		it("Must support setMethod and setData API", ()=>{
			expect(remote.setMethod).to.be.a("function");
			expect(remote.setData).to.be.a("function");
			expect(remote.api).to.be.an("object");
			expect(remote.api.setMethod).to.be.a("function");
			expect(remote.api.setData).to.be.a("function");
			expect(remote.api.runMethod).to.be.a("function");
		});
		it("Must block call without CSRF", ()=>{
			return remote.callHandler(
				req_mock({}, { csrfkey: "321"}),
				res_mock({ error:'CSRF detected' }, 500)
			).catch((e)=> expect(e).to.be.equal('CSRF detected'));
		});
		it("Must block call with invalid CSRF", ()=>{
			return remote.callHandler(
				req_mock({ key:"123"}, { csrfkey:"321" }),
				res_mock({ error:'CSRF detected' }, 500)
			).catch((e)=> expect(e).to.be.equal('CSRF detected'));
		});
		it("Must ignore invalid method name in multi-call mode", ()=>{
			var pack = JSON.stringify([
				{ name:"test", args:[1,2] },
				{ name:"obj.b", args:[3,4] }
			]);

			return remote.callHandler(
				req_mock({ key:"123", payload:pack }, { csrfkey:"123" }),
				res_mock({ error: "Method not found: obj.b" }, 500)
			).catch((e)=> expect(e.message).to.be.equal('Method not found: obj.b'));
		});
		it("Must run method in multi-call mode", ()=>{
			remote.config.ignoreError = true;

			var pack = JSON.stringify([
				{ name:"test", args:[1,2] },
				{ name:"obj.a", args:[3,4] }
			]);

			return remote.callHandler(
				req_mock({ key:"123", payload:pack }, { csrfkey:"123" }),
				res_mock({ data:[3,12] }, 200)
			);
		});
		it("Must process error in multi-call mode", ()=>{
			remote.config.ignoreError = true;

			var pack = JSON.stringify([
				{ name:"test", args:[1,2] },
				{ name:"obj.c", args:[3,4] },
				{ name:"obj.a", args:[3,4] }
			]);

			return remote.callHandler(
				req_mock({ key:"123", payload:pack }, { csrfkey:"123" }),
				res_mock({ data:[3, { __webix_remote_error: "Error" },12] }, 200)
			);
		});
	});

	describe("Server side - Access rights", () => {
		before(()=>{
			remote.setMethod("all@runA", () => 1);
			remote.setMethod("user@runB", () => 2);
			remote.setMethod("admin@runC", () => 3);
		});

		it("blocks user methods for not logged users", () => {
			remote.config.ignoreError = false;
			return remote.callHandler(
				req_mock(
					{ payload:JSON.stringify([{ name:"runB" }]), key:"123" },
					{ csrfkey: "123" }
				),
				res_mock({ error:"Method not found: runB"}, 500)
			).catch((e) => expect(e.message).to.equal("Method not found: runB"));
		});
		it("blocks admin methods for not logged users", () => {
			remote.config.ignoreError = true;
			return remote.callHandler(
				req_mock(
					{ payload:JSON.stringify([{ name:"runC" }]), key:"123" },
					{ csrfkey: "123" }
				),
				res_mock({ error:"Method not found: runC"}, 500)
			).catch((e) => expect(e.message).to.equal("Method not found: runC"));
		});

		it("allows user methods for logged users", () => {
			remote.config.ignoreError = true;
			return remote.callHandler(
				req_mock(
					{ payload:JSON.stringify([{ name:"runB" }]), key:"123" },
					{ csrfkey: "123", user:{ id:"1" }}
				),
				res_mock({ data: [2]}, 200)
			);
		});
		it("blocks admin methods for logged users", () => {
			remote.config.ignoreError = true;
			return remote.callHandler(
				req_mock(
					{ payload:JSON.stringify([{ name:"runC" }]), key:"123" },
					{ csrfkey: "123", user:{ id:"1" }}
				),
				res_mock({ error:"Method not found: runC"}, 500)
			).catch((e) => expect(e.message).to.equal("Method not found: runC"));
		});
		it("allows admin methods for admin users", () => {
			remote.config.ignoreError = true;
			return remote.callHandler(
				req_mock(
					{ payload:JSON.stringify([{ name:"runC" }]), key:"123" },
					{ csrfkey: "123", user:{ id:"1", role:"admin" }}
				),
				res_mock({ data: [3]}, 200)
			);
		});

		it("allows to call public methods", () => {
			remote.config.ignoreError = true;

			return remote.callHandler(
				req_mock(
					{ payload:JSON.stringify([{ name:"runA" }]), key:"123" },
					{ csrfkey: "123" }
				),
				res_mock({ data: [1] }, 200)
			);
		})

		it("$req in method points to the request", () => {
			remote.config.ignoreError = true;

			var req = req_mock(
				{ payload:JSON.stringify([{ name:"runD", args:[1] }]), key:"123"},
				{ csrfkey: "123" }
			);
			remote.setMethod("runD", function(a, $req){
				expect(a).to.equal(1);
				expect($req).to.equal(req);
				return 4;
			});

			return remote.callHandler(
				req,
				res_mock({ data: [4] }, 200)
			);
		})

		it("$req in method with optional parameters", () => {
			remote.config.ignoreError = true;

			var req = req_mock(
				{ payload:JSON.stringify([{ name:"runD", args:[1] }]), key:"123" },
				{ csrfkey: "123" }
			);
			remote.setMethod("runD", function(a,b,c,$req){
				expect(a).to.equal(1);
				expect(b).to.equal(this.undefined);
				expect(c).to.equal(this.undefined);
				expect($req).to.equal(req);
				return 4;
			});

			return remote.callHandler(
				req,
				res_mock({ data: [4] }, 200)
			);
		})


	});

});