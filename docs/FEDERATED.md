# Connections and Aggregations in Federated Learning

This documentation describes how connections between the server and clients are established, how model updates are aggregated and how updated weights are distributed.

## Connecting to the Server

Clients participating in federated learning connect directly to the server. The server acts as the central coordination and aggregation point. Therefore, the clients only need to establish a connection with the server.

When a client connects, the server assigns it a client ID and sends it the latest available global model weights and training information. The client initializes its local model with these weights and can begin training on its local model.

## Aggregating Model Updates

After finishing local training for a round, each client sends its model update to the server using a `SendPayload` message. This message contains the client's current round number so that the server can synchronize model weights aggregation.

The server checks the weight update contribution and adds it to the aggregator. When the required number of contributions has been received, the aggregator combines the client updates according to the aggregation mode and produces a new global model update.

The server then sends the aggregated result to each participants using a `ReceiveServerPayload` message. Each client updates its local model to the received weights and proceeds to the next training round.

After every successful aggregation, the server also stores the resulting weights as the latest global model weights.

## Clients Joining During Training

When a new client joins an ongoing training round, the server sends it the latest available global model weights. The new client can then begin local training from the latest globally aggregated model.

## Event flow

```mermaid
sequenceDiagram
    autonumber
    participant T as Trainer
    participant C as FederatedClient
    participant S as Server
    participant O as Other clients

    rect rgb(240,240,240)
        Note over T,S: 1. Connecting
        T->>C: connect()
        C->>S: WebSocket connect + ClientConnected
        S-->>C: NewFederatedNodeInfo { id, payload, round,<br/>nbOfParticipants, waitForMoreParticipants }
        Note over C: aggregator.setRound(round)
        C-->>T: base model with the latest global weights
        Note over C: a client joining mid-training gets the latest<br/>global weights here, no syncing handshake needed
    end

    rect rgb(240,240,240)
        Note over T,S: 2. Round begin
        T->>C: onRoundBeginCommunication()
        Note over C: status "local training"
        T->>T: local training
    end

    rect rgb(240,240,240)
        Note over T,S: 3. Round end, sending the local update
        T->>C: onRoundEndCommunication(weights)
        Note over C: waits here while there are<br/>not enough participants
        Note over C: status "updating model"
        C->>S: SendPayload { payload, round }
    end

    rect rgb(240,240,240)
        Note over C,O: 4. Server aggregation
        O->>S: SendPayload from the other clients
        Note over S: the aggregator waits for all<br/>registered clients of the round
        Note over S: aggregate, save as the latest global weights
    end

    rect rgb(240,240,240)
        Note over T,O: 5. Global update
        S-->>C: ReceiveServerPayload { payload, round, nbOfParticipants }
        S-->>O: ReceiveServerPayload
        Note over C: aggregator.setRound(round)
        C-->>T: global weights
    end

    opt stale or invalid contribution
        Note over S: contribution dropped, no aggregation
        S-->>C: ReceiveServerPayload with the previous<br/>round's global weights
        Note over S: nothing is sent if there is no global<br/>model yet, i.e. on the first round
    end

    opt participants drop below the minimum, at any point
        S-->>C: WaitingForMoreParticipants
        Note over C: status "not enough participants",<br/>waits before sending its weights
        S-->>C: EnoughParticipants
        Note over C: resumes, re-emitting the previous status
    end

    opt every participant leaves
        Note over S: resets the session, the latest global<br/>weights go back to the initial ones
    end
```
