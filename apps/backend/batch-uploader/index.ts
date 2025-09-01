import redisClient from "@repo/redis-client";
import { BATCH_UPLOADER_STREAM, CONSUMER_GROUP, CONSUMER_NAME, BATCH_SIZE } from "./config";
import { processBatch } from "./processor";

async function initializeConsumerGroup() {
try {
    await redisClient.xgroup("CREATE", BATCH_UPLOADER_STREAM, CONSUMER_GROUP, "$", "MKSTREAM");
    console.log("Consumer group created");
} catch (error: any) {
    if (error.message.includes("BUSYGROUP")) {
    console.log("Consumer group already exists");
    } else {
    console.error("Error creating consumer group:", error);
    }
}
}

async function main() {
await initializeConsumerGroup();

console.log("Batch uploader started, waiting for data...");

// Cross-call batching variables
let messageBuffer: any[] = [];
let lastFlushTime = Date.now();
const TARGET_BATCH_SIZE = 100;
const FLUSH_TIMEOUT_MS = 5000; // 5 seconds

while (true) {
    try {
    // Read messages from the stream
    const messages = await redisClient.xreadgroup(
        "GROUP", CONSUMER_GROUP, CONSUMER_NAME,
        "COUNT", BATCH_SIZE,
        "BLOCK", 1000, // Block for 1 second
        "STREAMS", BATCH_UPLOADER_STREAM, ">"
    ) as any;

    if (messages && messages.length > 0) {
        const streamData = messages[0][1]; // Array of [messageId, fields]
        console.log(`Received ${streamData.length} messages`);
        
        // Add to buffer instead of processing immediately
        messageBuffer.push(...streamData);
        console.log(`Buffer now contains ${messageBuffer.length} messages`);
        
        // Check if we should flush the buffer
        const shouldFlushSize = messageBuffer.length >= TARGET_BATCH_SIZE;
        const shouldFlushTimeout = Date.now() - lastFlushTime > FLUSH_TIMEOUT_MS;
        
        if (shouldFlushSize || shouldFlushTimeout) {
            console.log(`Flushing buffer: ${messageBuffer.length} messages (size: ${shouldFlushSize}, timeout: ${shouldFlushTimeout})`);
            
            // Process the accumulated batch
            await processBatch(messageBuffer);
            
            // Reset buffer and timer
            messageBuffer = [];
            lastFlushTime = Date.now();
        }
    }
    } catch (error) {
    console.error("Error reading from stream:", error);
    await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
}

main().catch(console.error);