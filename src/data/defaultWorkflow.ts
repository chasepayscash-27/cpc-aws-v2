export interface DefaultWorkflowTask {
  order: number;
  stage: string;
  owner: string;
  responsibilities: string;
  notes: string;
}

export const defaultWorkflow: DefaultWorkflowTask[] = [
  { order: 1, stage: "Offer & Closing", owner: "Acquisition Team", responsibilities: "Make offer and close property", notes: "Keys obtained from agents" },
  { order: 2, stage: "Key Handling", owner: "Unspecified", responsibilities: "Put keys in lockbox and on desk", notes: "Trigger for operations" },
  { order: 3, stage: "Utility Activation", owner: "Devin", responsibilities: "Turn on utilities and coordinate inspections", notes: "Alerts team if gas/water inspections needed" },
  { order: 4, stage: "Pre-Construction Utility Check", owner: "Kevin & Matt", responsibilities: "Verify water, gas, and power are active", notes: "Gas lock is critical blocker" },
  { order: 5, stage: "Initial Walkthrough", owner: "Kevin & Matt", responsibilities: "Review layout changes and scope of work", notes: "Kevin creates initial material list" },
  { order: 6, stage: "Material Ordering", owner: "Kevin", responsibilities: "Order materials and coordinate delivery", notes: "Based on initial walkthrough" },
  { order: 7, stage: "Contractor Walkthrough", owner: "Matt", responsibilities: "Walk contractor through job scope and pricing", notes: "Contractor agrees on pricing" },
  { order: 8, stage: "Dumpster & Delivery Coordination", owner: "Kevin", responsibilities: "Arrange dumpster and material delivery", notes: "Happens before work begins" },
  { order: 9, stage: "Construction Oversight", owner: "Matt", responsibilities: "Visit job sites 2–3 times weekly", notes: "Quality control and contractor management" },
  { order: 10, stage: "Supplemental Oversight", owner: "Kevin", responsibilities: "Weekly or biweekly visits", notes: "Sends feedback only to Matt" },
  { order: 11, stage: "Process Communication", owner: "Matt", responsibilities: "Central communication hub", notes: "Avoids confusion with contractors" },
  { order: 12, stage: "Mid-Project Purchasing", owner: "Kevin", responsibilities: "Order additional items like countertops", notes: "Triggered by Matt" },
  { order: 13, stage: "Final Walkthrough", owner: "Matt + Team", responsibilities: "Ensure project completion quality", notes: "Possible future involvement from Chase" },
  { order: 14, stage: "Photography & Staging", owner: "Matt", responsibilities: "Coordinate staging and listing photos", notes: "Pre-market preparation" },
  { order: 15, stage: "Listing Maintenance", owner: "Justin", responsibilities: "Check homes weekly/biweekly after listing", notes: "Grass, bugs, mold, cleanliness" },
  { order: 16, stage: "Repair Addendums", owner: "Justin", responsibilities: "Sole owner of repair addendum process", notes: "Prevents responsibility confusion" },
  { order: 17, stage: "Repair Documentation", owner: "Justin", responsibilities: "Send invoices/photos to agents", notes: "Required for closing" },
  { order: 18, stage: "Final Closing Tasks", owner: "Justin", responsibilities: "Retrieve lockbox after closing", notes: "Final operational step" },
];
