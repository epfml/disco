import { assertTrue, assertEqualSizes } from './assert'
import { Weights } from '@/types'

import * as tf from '@tensorflow/tfjs'
require('@tensorflow/tfjs-node');

export abstract class UnitTester {

    protected readonly lengths : Array<number> = [0, 1, 2, 3];
    protected readonly shapes : Array<number[]> = [
        [],
        [10],
        [4,5],
        [4,5],
        [1,35,3]
    ];
    protected zeros : Array<Weights>;

    constructor() {
        assertTrue(this.shapes.length > this.lengths[this.lengths.length - 1]);
        this.zeros = [];
        for (let l of this.lengths){
            let w : Weights = [];
            w.push(tf.zeros(this.shapes[l]));
            this.zeros.push(w);
        }
        assertEqualSizes(this.zeros[2], this.zeros[3]) //actually equal sizes
        let pass: Boolean = false;
        try{
            assertEqualSizes(this.zeros[1], this.zeros[3]) //not equal sizes, check for error thrown
        }
        catch(e){
            pass=true
        }
        if (!pass){
            throw new Error('Different weight shapes does not throw error')
        }
    }



    protected abstract runTests() : string;

    test() : void {
        console.log('\x1b[33m%s\x1b[0m', this.runTests());
    }
}