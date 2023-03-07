// PSET 6

import { mempool } from "./mempool";
import { Transaction } from "./transaction";
import { EventEmitter } from "node:events";
import { db } from "./object";
import { ver } from "./crypto/signature";
import { canonicalize } from 'json-canonicalize'

let newBlock;

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

while (true) {
    // hash newBlock with nonce
    // if successful (PoW equation), broadcast
    // update newBlock with new nonce++
}
