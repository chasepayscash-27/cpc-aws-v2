import { describe, expect, it } from "vitest";
import { defaultWorkflow, resolveTaskWorkflowType } from "./defaultWorkflow";

describe("defaultWorkflow construction steps", () => {
  it('includes "All Windows Open & Close" as the final construction workflow step', () => {
    const constructionTasks = defaultWorkflow.filter((task) => task.workflowType === "Construction Workflow");
    const finalConstructionTask = constructionTasks[constructionTasks.length - 1];
    const newStep = constructionTasks.find((task) => task.stage === "All Windows Open & Close");

    expect(newStep).toBeDefined();
    expect(finalConstructionTask?.stage).toBe("All Windows Open & Close");
  });

  it("resolves the new construction step to Construction Workflow by stage and order", () => {
    const newStep = defaultWorkflow.find((task) => task.stage === "All Windows Open & Close");
    expect(newStep).toBeDefined();

    expect(resolveTaskWorkflowType({ stage: "All Windows Open & Close" })).toBe("Construction Workflow");
    expect(resolveTaskWorkflowType({ order: newStep!.order })).toBe("Construction Workflow");
  });
});
