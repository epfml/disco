export class TrainingInformant {  
    constructor(length){
        // number of people with whom I've shared my model
        this.whoReceivedMyModel = new Set();

        // how many times the model has been averaged with someone's else model
        this.nbrUpdatesWithOthers = 0;

        // how much time I've been waiting for a model
        this.waitingTime = 0;

        // number of weight requests I've responded to
        this.nbrWeightRequests = 0;

        // message feedback from peer-to-peer training 
        this.nbrMessageToShow = length
        this.messages = []
    }

    updateWhoReceivedMyModel(peer_name) {
        this.whoReceivedMyModel.add(peer_name)
    }

    updateNbrUpdatesWithOthers(nbr_updates) {
        this.nbrUpdatesWithOthers += nbr_updates
    }

    updateWaitingTime(time) {
        this.waitingTime += time
    }

    updateNbrWeightsRequests(nbr_requests) {
        this.nbrWeightRequests += nbr_requests
    }

    addMessage(msg) {
        if (this.messages.length >= this.nbrMessageToShow) {
            this.messages.shift();
        } 
        this.messages.push(msg);       
    }
}