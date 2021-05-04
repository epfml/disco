export class MessageConsole {
    
    constructor(length){
        this.length = length
        this.messages = []
    }

    addMessage(msg) {
        if (this.messages.length >= this.length) {
            this.messages.shift();
        } 
        this.messages.push(msg);       
    }
}