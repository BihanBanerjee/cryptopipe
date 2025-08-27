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
        
        // Process the batch of messages
        await processBatch(streamData);
    }
    } catch (error) {
    console.error("Error reading from stream:", error);
    await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
}

main().catch(console.error);