import Cloudflare from "./src/classes/cloudflare";
import * as dotenv from "dotenv";
dotenv.config();

async function runTest() {
    const cld = new Cloudflare({ endpoint: process.env.CLOUDFLARE_ENDPOINT || "" });

    console.log("Starting topic generation test with cleanup verification...");
    // Test with a prompt that usually triggers conversational filler
    const topic = await cld.generateTopic("3 curiosities about Jupiter");
    
    console.log("-----------------------------------");
    console.log("RAW TOPIC OUTPUT:");
    console.log(topic);
    console.log("-----------------------------------");

    if (topic && (topic.toLowerCase().includes("here is") || topic.includes("**") || topic.includes("Sure!"))) {
        console.error("❌ FAILURE: Response still contains markdown or conversational filler!");
    } else if (topic) {
        console.log("✅ SUCCESS: Topic is clean and ready for frontend parsing.");
    } else {
        console.error("❌ FAILURE: No topic generated.");
    }
}

runTest();
