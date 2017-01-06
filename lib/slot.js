var uid = require("./uid.js");

function SlotHelper(name, config){
    this.name = name;
    this.config = config;
    this.handlers = [];
}
SlotHelper.prototype = {
    //adds new handler to the slot
    //returns handler id
    attach:function(code, config){
        config = config || {};
        var id = config.id || uid();
        this.handlers.push({
            id, code
        });
        return id;
    },
    //removes handler from the slot
    //when id not provided, removes all handlers
    detach:function(id){
        if (!id)
            this.handlers = [];
        else {
            let index = this.handlers.findIndex(obj => obj.id == id);
            if (index !== -1)
                this.handlers.splice(index, 1);
        }
    },
    //trigger handlers
    trigger:function(data){
        for (var i=0; i<this.handlers.length; i++){
            var action = this.handlers[i];
            action.code.apply((action.bind || this ), data);
        }   
    }
};

module.exports = {
    SlotHelper
};