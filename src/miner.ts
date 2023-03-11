// PSET 6
import { hash } from "./crypto/hash";
import { mempool } from "./mempool";
import { Transaction } from "./transaction";
import { EventEmitter } from "node:events";
import { db } from "./object";
import { ver } from "./crypto/signature";
import { canonicalize } from "json-canonicalize";
import { BlockObjectType } from "./message";
import { network } from "./network";
import { chainManager } from "./chain";
import { eventEmitter } from "./chain";
import { Block } from "./block";

const ourPubKey = "";

const TARGET = "00000000abc00000000000000000000000000000000000000000000000000000";

let newBlock: BlockObjectType;

async function findTxInMempool() {
    // returns tx object
    const pk = "3f0bc71a375b574e4bda3ddf502fe1afd99aa020bf6049adfe525d9ad18ff33f";
    const txids = await db.get("mempool:txids");
    txids.forEach(async (txid: any) => {
        const tx = await db.get(txid);
        for (let i = 0; i < tx.inputs.length; i++) {
            const sig = tx.inputs[i].sig;
            const msg = canonicalize(tx);
            if (await ver(sig, msg, pk)) {
                return txid;
            }
        }
    });
    return;
}

function buildNewBlock(longestChainTip: Block, graderTxId: string) {
    // build block including (1) coinbase (send 50 bu to us, important: change height!) and (2) graderTx
    // set nonce (variable and block object property) to a random (but valid) value
    // store block in newBlock

    let height: number = 0;
    if (longestChainTip.height != undefined) {
        height = longestChainTip.height + 1;
    }

    const coinbaseTx: Transaction = Transaction.fromNetworkObject({
        type: "transaction",
        outputs: [
            {
                value: 50,
                pubkey: ourPubKey,
            },
        ],
        height: height,
    });
    network.broadcast(coinbaseTx);

    newBlock = {
        type: "block",
        previd: longestChainTip.blockid,
        txids: [coinbaseTx.txid, graderTxId],
        nonce: randomIntFromInterval(0, 0x0fffffffffffffffffffffffffffffff).toString(),
        T: "00000000abc00000000000000000000000000000000000000000000000000000",
        created: Date.now(),
        miner: "DAI shillers",
        studentids: ["KEVIN ID", "AADI ID", "LICHU ID"],
    };
}

// on chaintip change:
// 1. find tx in mempool signed by the given pk (findTxInMempool)
// 2. rebuild newBlock (buildNewBlock)

export async function rebuildBlock(longestChainTip: Block) {
    const signedtx = await findTxInMempool();
    if (signedtx != undefined) {
        buildNewBlock(longestChainTip, signedtx);
    }
}

function converter(object: BlockObjectType) {
    const netObj: BlockObjectType = {
        type: "block",
        previd: object.previd,
        txids: object.txids,
        nonce: object.nonce,
        T: object.T,
        created: object.created,
        miner: object.miner,
    };

    if (object.note !== undefined) {
        netObj.note = object.note;
    }
    if (object.studentids !== undefined) {
        netObj.studentids = object.studentids;
    }
    return netObj;
}

function randomIntFromInterval(min: number, max: number) {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
}

while (true) {
    rebuildBlock(chainManager.longestChainTip?);
    // hash newBlock with nonce

    // we only do this when the chaintip changes:
    // rebuildBlock();
    // let curBlock = converter(newBlock);
    // let initNonce = randomIntFromInterval(0, 0x0fffffffffffffffffffffffffffffff); // is warning here a problem?
    // this looks like it will make our mining inefficient
    // curBlock.nonce = initNonce.toString();

    while (true) {
        let blockid = hash(canonicalize(newBlock));
        // if successful (PoW equation), broadcast
        if (BigInt(`0x${blockid}`) <= BigInt(`0x${TARGET}`)) {
            network.broadcast(newBlock); // seems like it can be gossipped w/out wrapper
            break;
        }

        // and if we still don't have it, update w/ nonce++ and try again
        newBlock.nonce = newBlock.nonce + 1;
    }
}

eventEmitter.on("chaintip changed", (chainTip: Block) => {
    rebuildBlock(chainTip);
});
