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
import { delay } from "./promise";
import { checkPrimeSync } from "node:crypto";
import cryptoRandomString from "crypto-random-string";

const ourPubKey = "";

const targetString = "0x00000000abc00000000000000000000000000000000000000000000000000000";
const targetBigInt = BigInt(targetString);

let newBlock: BlockObjectType;

async function findTxInMempool(): Promise<string> {
    // returns tx object
    const pk = "3f0bc71a375b574e4bda3ddf502fe1afd99aa020bf6049adfe525d9ad18ff33f";
    const txids = await db.get("mempool:txids");
    console.log("MEMPOOL", txids);
    let graderTxId = "no tx";

    for (const txid of txids) {
        console.log("txid to check", txid);
        if (!(await db.get(`object:${txid}`))) {
            console.log(txid, "does not exits on mempool");
            continue;
        }
        const tx = await db.get(`object:${txid}`);
        console.log("tx!", tx);
        let signatures: string[] = [];

        for (let i = 0; i < tx.inputs.length; i++) {
            signatures.push(tx.inputs[i].sig);
            tx.inputs[i].sig = null;
        }

        for (const sig of signatures) {
            console.log("tx without sigs", JSON.stringify(tx));
            const msg = canonicalize(tx);
            if (await ver(sig, msg, pk)) {
                console.log("gets here!");
                graderTxId = txid;
                break;
            }
        }
    }
    console.log("grader tx: ", graderTxId);
    return graderTxId;
}

async function rebuildBlock(longestChainTip: Block) {
    const graderTxId = await findTxInMempool();
    if (graderTxId == "no tx") {
        console.log("did not find tx :(");
        return;
    }

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
                value: 50000000000000,
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
        nonce: cryptoRandomString({ length: 10 }),
        T: "00000000abc00000000000000000000000000000000000000000000000000000",
        created: Date.now(),
        miner: "DAI shillers",
        studentids: ["kevnli7", "aadinash", "acuna"],
    };
}

// on chaintip change:
// 1. find tx in mempool signed by the given pk (findTxInMempool)
// 2. rebuild newBlock (buildNewBlock)

// function converter(object: BlockObjectType) {
//     const netObj: BlockObjectType = {
//         type: "block",
//         previd: object.previd,
//         txids: object.txids,
//         nonce: object.nonce,
//         T: object.T,
//         created: object.created,
//         miner: object.miner,
//     };

//     if (object.note !== undefined) {
//         netObj.note = object.note;
//     }
//     if (object.studentids !== undefined) {
//         netObj.studentids = object.studentids;
//     }
//     return netObj;
// }

function randomIntFromInterval(min: number, max: number) {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
}

eventEmitter.on("chaintip changed", (chaintip: Block) => {
    console.log("chaintip changd, new chaintip: ", chaintip.blockid);
    rebuildBlock(chaintip);
});

export async function mine() {
    await delay(4000);

    while (chainManager.longestChainTip == null) {
        await delay(1000);
    }
    while ((await findTxInMempool()) == "no tx") {
        await delay(1000);
        console.log("no tx from grader");
    }

    await rebuildBlock(chainManager.longestChainTip);

    while (true) {
        console.log(newBlock);
        let blockid = hash(canonicalize(newBlock));
        console.log("got this blockid: ", blockid);
        // if successful (PoW equation), broadcast
        if (BigInt(`0x${blockid}`) <= targetBigInt) {
            network.broadcast(newBlock); // seems like it can be gossipped w/out wrapper
            break;
        }

        // and if we still don't have it, update w/ nonce++ and try again
        // newBlock.nonce = (+newBlock.nonce + 1).toString();
    }
}
