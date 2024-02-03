import { Set } from 'immutable'
import axios from 'axios'

import {
    tf,
    Task,
    TrainingInformant,
    serialization,
    WeightsContainer,
} from '..'
import { NodeID } from './types'
import { EventConnection } from './event_connection'
import { Aggregator } from '../aggregator'

/**
 * Main, abstract, class representing a Disco client in a network, which handles
 * communication with other nodes, be it peers or a server.
 */
export abstract class Base {
    /**
     * Own ID provided by the network's server.
     */
    protected _ownId?: NodeID
    /**
     * The network's server.
     */
    protected _server?: EventConnection
    /**
     * The aggregator's result produced after aggregation.
     */
    protected aggregationResult?: Promise<WeightsContainer>

    constructor(
        /**
         * The network server's URL to connect to.
         */
        public readonly url: URL,
        /**
         * The client's corresponding task.
         */
        public readonly task: Task,
        /**
         * The client's aggregator.
         */
        public readonly aggregator: Aggregator
    ) {}

    /**
     * Handles the connection process from the client to any sort of network server.
     */
    async connect(): Promise<void> {}

    /**
     * Handles the disconnection process of the client from any sort of network server.
     */
    async disconnect(): Promise<void> {}

    /**
     * Fetches the latest model available on the network's server, for the adequate task.
     * @returns The latest model
     */
    async getLatestModel(): Promise<tf.LayersModel> {
        const url = new URL('', this.url.href)
        if (!url.pathname.endsWith('/')) {
            url.pathname += '/'
        }
        url.pathname += `tasks/${this.task.id}/model.json`

        const response = await axios.get(url.href)

        return await serialization.model.decode(response.data)
    }

    /**
     * Communication callback called once at the beginning of the training instance.
     * @param weights The initial model weights
     * @param trainingInformant The training informant
     */
    async onTrainBeginCommunication(
        weights: WeightsContainer,
        trainingInformant: TrainingInformant
    ): Promise<void> {}

    /**
     * Communication callback called once at the end of the training instance.
     * @param weights The final model weights
     * @param trainingInformant The training informant
     */
    async onTrainEndCommunication(
        weights: WeightsContainer,
        trainingInformant: TrainingInformant
    ): Promise<void> {}

    /**
     * Communication callback called at the beginning of every training round.
     * @param weights The most recent local weight updates
     * @param round The current training round
     * @param trainingInformant The training informant
     */
    async onRoundBeginCommunication(
        weights: WeightsContainer,
        round: number,
        trainingInformant: TrainingInformant
    ): Promise<void> {}

    /**
     * Communication callback called the end of every training round.
     * @param weights The most recent local weight updates
     * @param round The current training round
     * @param trainingInformant The training informant
     */
    async onRoundEndCommunication(
        weights: WeightsContainer,
        round: number,
        trainingInformant: TrainingInformant
    ): Promise<void> {}

    get nodes(): Set<NodeID> {
        return this.aggregator.nodes
    }

    get ownId(): NodeID {
        if (this._ownId === undefined) {
            throw new Error('the node is not connected')
        }
        return this._ownId
    }

    get server(): EventConnection {
        if (this._server === undefined) {
            throw new Error('server undefined, not connected')
        }
        return this._server
    }
}
