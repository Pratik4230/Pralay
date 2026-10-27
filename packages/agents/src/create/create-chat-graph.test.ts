import { describe, expect, test } from "bun:test";
import {
  AIMessage,
  HumanMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";

import { createCreateChatWorkflow } from "./create-chat-graph.js";

describe("Create chat graph checkpointing", () => {
  test("resumes at the failed tool without replaying a completed tool", async () => {
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

    const graph = workflow.compile({ checkpointer: new MemorySaver() });
    const config = {
      configurable: {
        thread_id: "run-1",
        assistant_thread_id: "thread-1",
        assistant_run_id: "run-1",
      },
    };
    const initialState = {
      messages: [new HumanMessage("start")] as BaseMessage[],
      iteration: 0,
      nextToolIndex: 0,
      finalText: "",
      requestId: "request-1",
    };

    await expect(graph.invoke(initialState, config)).rejects.toThrow(
      "temporary tool failure",
    );

    const result = await graph.invoke(null, config);
    expect(result.finalText).toBe("Finished");
    expect(toolExecutions).toEqual([1, 2]);
  });
});
