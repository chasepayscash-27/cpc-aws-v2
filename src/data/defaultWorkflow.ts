export interface DefaultWorkflowTask {
  order: number;
  stage: string;
  owner: string;
  responsibilities: string;
  notes: string;
}

export const defaultWorkflow: DefaultWorkflowTask[] = [
  { order: 1, stage: "Offer placed", owner: "Justin", responsibilities: "Place offer on the property", notes: "" },
  { order: 2, stage: "Closed on property", owner: "Devin", responsibilities: "Close on the property", notes: "" },
  { order: 3, stage: "Got keys in lockbox", owner: "Justin", responsibilities: "Obtain keys and place in lockbox", notes: "" },
  { order: 4, stage: "Utility activation", owner: "Devin", responsibilities: "Activate all utilities for the property", notes: "" },
  { order: 5, stage: "Utilities check", owner: "Matt and Kevin", responsibilities: "Verify water, gas, and power are active", notes: "" },
  { order: 6, stage: "Initial walk through", owner: "Matt and Kevin", responsibilities: "Walk through property and assess scope of work", notes: "" },
  { order: 7, stage: "Dumpster Ordered", owner: "", responsibilities: "Order dumpster for construction debris", notes: "" },
  { order: 8, stage: "Initial material ordered", owner: "Kevin", responsibilities: "Order initial materials needed for construction", notes: "" },
  { order: 9, stage: "Contractor walk through", owner: "Matt", responsibilities: "Walk contractor through job scope and pricing", notes: "" },
  { order: 10, stage: "Construction finished", owner: "Matt", responsibilities: "Oversee and confirm construction completion", notes: "" },
  { order: 11, stage: "Final walk through", owner: "Matt", responsibilities: "Perform final walkthrough to ensure quality", notes: "" },
  { order: 12, stage: "Clean house", owner: "Matt", responsibilities: "Coordinate house cleaning after construction", notes: "" },
  { order: 13, stage: "Staging", owner: "Matt", responsibilities: "Coordinate property staging", notes: "" },
  { order: 14, stage: "Pictures", owner: "Matt", responsibilities: "Coordinate listing photography", notes: "" },
  { order: 15, stage: "On market", owner: "Devin", responsibilities: "List property on the market", notes: "" },
  { order: 16, stage: "Offer Accepted", owner: "Devin/Chase", responsibilities: "Accept offer on the property", notes: "" },
  { order: 17, stage: "Repair addendum", owner: "Justin", responsibilities: "Handle repair addendum process", notes: "" },
  { order: 18, stage: "Retrieve lock box after closing", owner: "Justin", responsibilities: "Retrieve lockbox after property closes", notes: "" },
];
