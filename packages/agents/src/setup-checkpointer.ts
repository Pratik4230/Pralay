import { setupCreateChatCheckpointer } from "./create/create-chat-checkpointer.js";

await setupCreateChatCheckpointer();
console.log("LangGraph Postgres checkpointer is ready.");
