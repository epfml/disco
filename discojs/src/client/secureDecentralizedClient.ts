import { List, Map, Seq, Set } from 'immutable'
import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
import { URL } from 'url'
import * as secureAggregationPeer from './secureAggregationPeer'

import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'

import {Decentralized} from './decentralized'

interface PeerMessage { epoch: number, weights: serialization.weights.Encoded }

export class secureDecentralizedClient extends Decentralized{
    private aggregationPeer!: secureAggregationPeer.TestClient
}