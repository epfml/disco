import * as assert from './assert'
import { Weights } from '../types'
import { UnitTester } from './unit_tester'

import * as tf from '@tensorflow/tfjs'
require('@tensorflow/tfjs-node');

class TestAssert extends UnitTester {

    assertTrue() : void {
        assert.assertTrue(true);

        let passing : boolean = false;
        try{
            assert.assertTrue(false);
        }
        catch(e){
            passing = true;
        }
        if (!passing){
            throw new Error("FAILING TEST: assert.assertTrue(false) does not throw an error.");
        }
    }

    assertEqualSizes() : void {
        //  TODO (using the attributes of UnitTester class)
        //assert.assertEqualSizes(this.lengths, this.shapes[4])
         //Is this necessary to extend from unittester?
    }

    assertThrowsError(): void{
    }

    runTests() : string {
        this.assertTrue();
        this.assertEqualSizes();
        this.assertThrowsError();
        return "All tests passed - TestAssert (not all tests implemented!)\nTests for assertEqualSizes and assertThrowsError haven't been implemented.";
    }
}

let tester : TestAssert = new TestAssert();
tester.test();