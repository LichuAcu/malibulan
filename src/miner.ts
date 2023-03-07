// PSET 6

import { mempool } from "./mempool";
import { Transaction } from "./transaction";

let newBlock;

function findTxInMempool(): Transaction {
    // returns tx object
    const pk = "3f0bc71a375b574e4bda3ddf502fe1afd99aa020bf6049adfe525d9ad18ff33f";
    // find tx signed by pk in mempool
}

function buildNewBlock(graderTx: Transaction) {
    // build block including (1) coinbase (send 50 bu to us, important: change height!) and (2) graderTx
    // set nonce (variable and block object property) to a random (but valid) value
    // store block in newBlock
}

// on chaintip change:
// 1. find tx in mempool signed by the given pk (findTxInMempool)
// 2. rebuild newBlock (buildNewBlock)

while (true) {
    // hash newBlock with nonce
    // if successful (PoW equation), broadcast
    // update newBlock with new nonce++
}
