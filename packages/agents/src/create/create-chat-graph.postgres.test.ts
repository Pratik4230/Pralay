import { randomUUID } from "node:crypto";

import { describe, expect, test } from "bun:test";
import {
  AIMessage,
  HumanMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";

import {
  deleteCreateChatCheckpoints,
  getCreateChatCheckpointer,
  setupCreateChatCheckpointer,
} from "./create-chat-checkpointer.js";
import { createCreateChatWorkflow } from "./create-chat-graph.js";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)("Create chat Postgres checkpointing", () => {
  test(
    "persists, resumes, and deletes a retrying graph run",
    async () => {
      await setupCreateChatCheckpointer();

      const checkpointer = getCreateChatCheckpointer();
      const threadId = `checkpoint-test-${randomUUID()}`;
      const runId = `run-${randomUUID()}`;
      const toolExecutions = [0, 0];
      let failSecondTool = true;

      const workflow = createCreateChatWorkflow({
        callModel: (state) => {
          if (state.iteration === 0) {
            return {
              messages: [
                new AIMessage({
                  content: "",
                  tool_calls: [
                    { id: "tool-1", name: "first_tool", args: {} },
                    { id: "tool-2", name: "second_tool", args: {} },
                  ],
                }),
              ],
              iteration: 1,
              nextToolIndex: 0,
              finalText: "",
            };
          }

          return {
            messages: [new AIMessage("Finished")],
            iteration: state.iteration + 1,
            nextToolIndex: 0,
            finalText: "Finished",
          };
        },
        callTool: (state) => {
          const index = state.nextToolIndex;
          toolExecutions[index] = (toolExecutions[index] ?? 0) + 1;
          if (index === 1 && failSecondTool) {
            failSecondTool = false;
            throw new Error("temporary tool failure");
          }

          return {
            messages: [
              new ToolMessage({
                tool_call_id: `tool-${index + 1}`,
                content: "ok",
              }),
            ],
            nextToolIndex: index + 1,
          };
        },
      });

      const graph = workflow.compile({ checkpointer });
      const config = {
        configurable: {
          thread_id: runId,
          assistant_thread_id: threadId,
          assistant_run_id: runId,
        },
      };

      try {
        await expect(
          graph.invoke(
            {
              messages: [new HumanMessage("start")] as BaseMessage[],
              iteration: 0,
              nextToolIndex: 0,
              finalText: "",
              requestId: "request-1",
            },
            config,
          ),
        ).rejects.toThrow("temporary tool failure");

        const result = await graph.invoke(null, config);
        expect(result.finalText).toBe("Finished");
        expect(toolExecutions).toEqual([1, 2]);

        const checkpoints = [];
        for await (const checkpoint of checkpointer.list({
          configurable: { thread_id: runId },
        })) {
          checkpoints.push(checkpoint);
        }
        expect(checkpoints.length).toBeGreaterThan(0);
        expect(
          new Set(
            checkpoints.map(
              (checkpoint) => checkpoint.config.configurable?.checkpoint_ns,
            ),
          ),
        ).toEqual(new Set([""]));
      } finally {
        await deleteCreateChatCheckpoints(runId);
      }

      expect(await checkpointer.getTuple(config)).toBeUndefined();
    },
    30_000,
  );
});
