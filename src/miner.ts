// PSET 6
import { hash } from './crypto/hash'
import { mempool } from "./mempool";
import { Transaction } from "./transaction";
import { EventEmitter } from "node:events";
import { db } from "./object";
import { ver } from "./crypto/signature";
import { canonicalize } from 'json-canonicalize'
import { BlockObjectType } from './message';
import { network } from './network'

const TARGET = '00000000abc00000000000000000000000000000000000000000000000000000'

let newBlock: BlockObjectType;

async function findTxInMempool() {
    // returns tx object
    const pk = "3f0bc71a375b574e4bda3ddf502fe1afd99aa020bf6049adfe525d9ad18ff33f";
    const txids = await db.get('mempool:txids');
    txids.forEach(async (txid: any) => {
        const tx = await db.get(txid);
        for (let i = 0; i < tx.inputs.length; i++) {
            const sig = tx.inputs[i].sig;
            const msg = canonicalize(tx);
            if (await ver(sig, msg, pk)) {
                return txid;
            }
        }
    })
    return;
    // find tx signed by pk in mempool
}

function buildNewBlock(object: any) {
    // build block including (1) coinbase (send 50 bu to us, important: change height!) and (2) graderTx
    // set nonce (variable and block object property) to a random (but valid) value
    // store block in newBlock
}

// on chaintip change:
// 1. find tx in mempool signed by the given pk (findTxInMempool)
// 2. rebuild newBlock (buildNewBlock)

export async function rebuildBlock() {
    const signedtx = findTxInMempool();
    if (signedtx != undefined) {
        newBlock = buildNewBlock(signedtx);
    }
}

// I don't know exactly how the event emitter thing works so I'm just simulating it 
// w/ a boolean for now
let event = false

function converter (object: BlockObjectType) {
    const netObj: BlockObjectType = {
        type: 'block',
        previd: object.previd,
        txids: object.txids,
        nonce: object.nonce,
        T: object.T,
        created: object.created,
        miner: object.miner,
      }
  
      if (object.note !== undefined) {
        netObj.note = object.note
      }
      if (object.studentids !== undefined) {
        netObj.studentids = object.studentids
      }
      return netObj
}

function randomIntFromInterval(min: number, max: number) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

while (true) {
    // hash newBlock with nonce
    rebuildBlock()
    let curBlock = converter(newBlock)
    let initNonce = randomIntFromInterval(0, 0x0fffffffffffffffffffffffffffffff)  // is warning here a problem?
    curBlock.nonce = initNonce.toString()

    while (true) {
        let blockid = hash(canonicalize(curBlock))
        // if successful (PoW equation), broadcast
        if (BigInt(`0x${blockid}`) <= BigInt(`0x${TARGET}`)) {
            network.broadcast(curBlock)  // seems like it can be gossipped w/out wrapper
            break;
        } 

        // now I want to check whether there's been a new block and start mining the next
        if (event) {
            break;
        }

        // and if we still don't have it, update w/ nonce++ and try again
        curBlock.nonce = curBlock.nonce + 1
    }
}
