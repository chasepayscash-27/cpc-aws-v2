import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { loadCsv } from '../utils/csv';
import type { ProjectRow } from '../types/project';
import { getPrimaryTasksAcrossProperties, filterTasksForTeamTab, getTasksForTeamMember } from '../components/propertyTaskCollections';
import { usePropertyTasks } from '../contexts/PropertyTasksContext';
import { buildTeamTaskCreatePayload } from './teamTaskCreatePayload';
import { toTitleCase } from '../utils/titleCase';
import '../App.css';

interface TeamMember {
  name: string;
  position?: string;
  email?: string;
}

interface TeamCsvRow {
  employee_name?: string;
  '\uFEFFemployee_name'?: string;
  employee_job_title?: string;
  employee_email?: string;
}

type PropertyTask = Schema['PropertyTask']['type'];
const client = generateClient<Schema>();

interface TeamTaskView {
  task: PropertyTask;
  propertyLabel: string;
}

interface ProjectOption {
  id: string;
  label: string;
}

const TEAM_TASK_WORKFLOW_TYPE = 'Team Task';
const TEAM_TASK_GENERAL_SUBTYPE = 'General Team Task';
const TEAM_TASK_PERSONAL_SUBTYPE = 'Personal Task';

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getEmployeeTokens(name: string): Set<string> {
  const cleaned = name.trim();
  const parts = cleaned.split(/\s+/).map(normalizeToken).filter(Boolean);
  const tokens = new Set(parts);
  tokens.add(normalizeToken(cleaned));
  return tokens;
}

function getAssigneeTokens(assigneeId: string): Set<string> {
  const parts = assigneeId
    .split(/(?:\band\b|\/|&|,)/i)
    .flatMap((segment) => segment.trim().split(/\s+/))
    .map(normalizeToken)
    .filter(Boolean);
  const tokens = new Set(parts);
  tokens.add(normalizeToken(assigneeId));
  return tokens;
}

function isTaskAssignedToEmployee(assigneeId: string, employeeName: string): boolean {
  const assigneeTokens = getAssigneeTokens(assigneeId);
  const employeeTokens = getEmployeeTokens(employeeName);
  for (const token of assigneeTokens) {
    if (employeeTokens.has(token)) return true;
  }
  return false;
}

function buildProjectLookup(rows: ProjectRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const displayName = row.name?.trim() || row.full_address?.trim();
    const keys = [row.project_uuid, row.name, row.full_address].map((value) => value?.trim()).filter(Boolean) as string[];
    for (const key of keys) {
      map.set(key, displayName || key);
    }
  }
  return map;
}

function buildProjectOptions(rows: ProjectRow[]): ProjectOption[] {
  const optionsById = new Map<string, ProjectOption>();
  for (const row of rows) {
    const id = row.project_uuid?.trim();
    if (!id) continue;
    const label = row.name?.trim() || row.full_address?.trim() || id;
    optionsById.set(id, { id, label });
  }
  return [...optionsById.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function isPersonalTask(task: PropertyTask): boolean {
  return task.workflowType === TEAM_TASK_WORKFLOW_TYPE && task.subWorkflowType === TEAM_TASK_PERSONAL_SUBTYPE;
}

function buildGeneralTaskOrder(): number {
  const timestampOffset = Math.floor(Date.now() / 1000) % 1000000;
  return 10000 + timestampOffset;
}

const TeamPage = () => {
  const { allTasks, isLoading: isTaskLoading, error: contextTaskError, updateTaskCompletion } = usePropertyTasks();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projectLookup, setProjectLookup] = useState<Map<string, string>>(new Map());
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggleError, setToggleError] = useState('');
  const [createError, setCreateError] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [completedByUser, setCompletedByUser] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskStage, setNewTaskStage] = useState('');
  const [newTaskPropertyId, setNewTaskPropertyId] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskIsPersonal, setNewTaskIsPersonal] = useState(false);

  const taskError = contextTaskError || toggleError;
  const tasks = useMemo(() => filterTasksForTeamTab(getPrimaryTasksAcrossProperties(allTasks)), [allTasks]);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        const loginId = user.signInDetails?.loginId?.trim();
        const identifier = loginId ?? user.username ?? user.userId;
        setCompletedByUser(identifier ?? null);
        setCurrentUserEmail(loginId ?? null);
      })
      .catch(() => {
        setCompletedByUser(null);
        setCurrentUserEmail(null);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([loadCsv<TeamCsvRow>('/data/cpc_job_titles.csv'), loadCsv<ProjectRow>('/data/projects_v2.csv')])
      .then(([teamRows, projectRows]) => {
        if (!isMounted) return;
        const cleanedMembers = teamRows
          .map((row) => {
            const name = (row.employee_name ?? row['\uFEFFemployee_name'])?.trim() || '';
            return {
              name,
              position: row.employee_job_title?.trim(),
              email: row.employee_email?.trim(),
            };
          })
          .filter((row) => row.name || row.position || row.email);
        setTeamMembers(cleanedMembers);
        setProjectLookup(buildProjectLookup(projectRows));
        setProjectOptions(buildProjectOptions(projectRows));
        setIsLoading(false);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setIsLoading(false);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load team member data.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = useCallback(
    async (task: PropertyTask, checked: boolean) => {
      setToggleError('');
      const completedAt = checked ? new Date().toISOString() : null;
      const completedBy = checked ? completedByUser : null;

      setUpdatingTaskIds((current) => [...current, task.id]);

      const { errors } = await updateTaskCompletion(task, checked, completedAt, completedBy);

      setUpdatingTaskIds((current) => current.filter((id) => id !== task.id));

      if (errors?.length) {
        setToggleError(errors.map((item) => item.message).join('; '));
      }
    },
    [completedByUser, updateTaskCompletion]
  );

  const openMemberTasks = useCallback((member: TeamMember) => {
    setCreateError('');
    setNewTaskStage('');
    setNewTaskPropertyId('');
    setNewTaskIsPersonal(false);
    setNewTaskAssignee(member.name);
    setSelectedMember(member);
  }, []);

  const isCurrentUserTeamMember = useCallback(
    (member: TeamMember): boolean => {
      const memberEmail = member.email?.trim().toLowerCase();
      const normalizedCurrentEmail = currentUserEmail?.trim().toLowerCase();
      if (memberEmail && normalizedCurrentEmail && memberEmail === normalizedCurrentEmail) {
        return true;
      }

      const identifier = completedByUser?.trim();
      if (!identifier) return false;
      return isTaskAssignedToEmployee(identifier, member.name);
    },
    [completedByUser, currentUserEmail]
  );

  const canCurrentUserViewTask = useCallback(
    (task: PropertyTask, member: TeamMember): boolean => {
      if (!isPersonalTask(task)) return true;
      return isCurrentUserTeamMember(member);
    },
    [isCurrentUserTeamMember]
  );

  const tasksByMember = useMemo(() => {
    const map = new Map<string, TeamTaskView[]>();
    for (const member of teamMembers) {
      const memberTasks = getTasksForTeamMember(tasks, member.name)
        .filter((task) => canCurrentUserViewTask(task, member))
        .map((task) => {
          const propertyId = task.propertyId?.trim() || '';
          return {
            task,
            propertyLabel: propertyId ? (projectLookup.get(propertyId) ?? propertyId) : TEAM_TASK_GENERAL_SUBTYPE,
          };
        })
        .sort((a, b) => {
          const completionDelta = Number(!!a.task.isComplete) - Number(!!b.task.isComplete);
          if (completionDelta !== 0) return completionDelta;
          return (a.task.order ?? Number.MAX_SAFE_INTEGER) - (b.task.order ?? Number.MAX_SAFE_INTEGER);
        });
      map.set(member.name, memberTasks);
    }
    return map;
  }, [canCurrentUserViewTask, projectLookup, teamMembers, tasks]);

  const selectedMemberTasks = useMemo(
    () => (selectedMember ? tasksByMember.get(selectedMember.name) ?? [] : []),
    [selectedMember, tasksByMember]
  );
  const isSelectedMemberCurrentUser = useMemo(
    () => (selectedMember ? isCurrentUserTeamMember(selectedMember) : false),
    [isCurrentUserTeamMember, selectedMember]
  );

  const handleCreateTask = useCallback(async () => {
    if (!selectedMember) return;
    if (newTaskIsPersonal && !isSelectedMemberCurrentUser) {
      setCreateError('Personal tasks can only be created for yourself.');
      return;
    }
    const stage = newTaskStage.trim();
    if (!stage) {
      setCreateError('Task title is required.');
      return;
    }

    const normalizedAssignee = (newTaskIsPersonal ? selectedMember.name : newTaskAssignee).trim();
    if (!normalizedAssignee) {
      setCreateError('Choose an assignee.');
      return;
    }

    setCreateError('');
    setIsCreatingTask(true);
    const { errors } = await client.models.PropertyTask.create(
      buildTeamTaskCreatePayload({
        propertyId: newTaskPropertyId,
        stage,
        order: buildGeneralTaskOrder(),
        isPersonal: newTaskIsPersonal,
        assignee: normalizedAssignee,
        createdById: completedByUser,
      })
    );
    setIsCreatingTask(false);

    if (errors?.length) {
      setCreateError(errors.map((item) => item.message).join('; '));
      return;
    }

    setNewTaskStage('');
    setNewTaskPropertyId('');
  }, [completedByUser, isSelectedMemberCurrentUser, newTaskAssignee, newTaskIsPersonal, newTaskPropertyId, newTaskStage, selectedMember]);

  const selectedMemberTaskGroups = useMemo(() => {
    const groups = new Map<string, TeamTaskView[]>();
    for (const task of selectedMemberTasks) {
      const existing = groups.get(task.propertyLabel) ?? [];
      existing.push(task);
      groups.set(task.propertyLabel, existing);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [selectedMemberTasks]);

  const selectedMemberOutstandingCount = selectedMemberTasks.filter(({ task }) => !task.isComplete).length;

  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Team</h1>
        <p className="muted">Meet our team members.</p>
      </div>

      <section className="grid">
        {isLoading && (
          <div className="card teamCard">
            <p className="muted">Loading team members...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="card teamCard">
            <p className="muted">{error}</p>
          </div>
        )}

        {!isLoading && !error && teamMembers.length === 0 && (
          <div className="card teamCard">
            <p className="muted">No team members found in cpc_job_titles.csv.</p>
          </div>
        )}

        {!isLoading &&
          !error &&
          teamMembers.map((member, index) => (
            <article key={`${member.name || 'member'}-${index}`} className="card teamCard">
              <button className="teamNameButton" onClick={() => openMemberTasks(member)}>
                <span className="teamName">{member.name || 'Unknown Team Member'}</span>
                <span className="teamTaskCount">
                  {tasksByMember.get(member.name)?.filter(({ task }) => !task.isComplete).length ?? 0} outstanding
                </span>
              </button>
              <div className="teamPosition">{member.position || 'Position not listed'}</div>
              {member.email ? (
                <a className="teamEmail" href={`mailto:${member.email}`}>
                  {member.email}
                </a>
              ) : (
                <span className="muted">Email not listed</span>
              )}
            </article>
          ))}
      </section>

      {selectedMember && (
        <div className="teamTaskModalOverlay" role="presentation" onClick={() => setSelectedMember(null)}>
          <section className="teamTaskModal card" role="dialog" aria-modal="true" aria-label={`Tasks for ${selectedMember.name}`} onClick={(event) => event.stopPropagation()}>
            <div className="teamTaskModalHeader">
              <div>
                <h2>{selectedMember.name} — Task List</h2>
                <p className="teamTaskModalSummary">
                  {selectedMemberOutstandingCount} outstanding of {selectedMemberTasks.length} assigned
                </p>
              </div>
              <button type="button" className="teamTaskModalClose" onClick={() => setSelectedMember(null)}>
                Close
              </button>
            </div>
            <div className="teamTaskComposer">
              <div className="teamTaskComposerRow">
                <input
                  type="text"
                  value={newTaskStage}
                  onChange={(event) => setNewTaskStage(event.currentTarget.value)}
                  placeholder={`Add a task for ${selectedMember.name}`}
                  className="teamTaskInput"
                  aria-label={`Task title for ${selectedMember.name}`}
                />
                <select
                  className="teamTaskInput"
                  value={newTaskPropertyId}
                  onChange={(event) => setNewTaskPropertyId(event.currentTarget.value)}
                  disabled={newTaskIsPersonal}
                  aria-label="Property for team task"
                >
                  <option value="">General Team Task</option>
                  {projectOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className="teamTaskInput"
                  value={newTaskIsPersonal ? selectedMember.name : newTaskAssignee}
                  onChange={(event) => setNewTaskAssignee(event.currentTarget.value)}
                  disabled={newTaskIsPersonal}
                  aria-label="Assignee for team task"
                >
                  <option value="">Select assignee</option>
                  {teamMembers.filter((member) => member.name.trim()).map((member) => (
                    <option key={member.name} value={member.name}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="teamTaskCreateButton" disabled={isCreatingTask} onClick={() => void handleCreateTask()}>
                  {isCreatingTask ? 'Saving…' : 'Add Task'}
                </button>
              </div>
              {isSelectedMemberCurrentUser && (
                <label className="teamTaskPersonalToggle">
                  <input
                    type="checkbox"
                    checked={newTaskIsPersonal}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setNewTaskIsPersonal(checked);
                      if (checked) {
                        setNewTaskPropertyId('');
                        setNewTaskAssignee(selectedMember.name);
                      }
                    }}
                  />
                  Personal task (self only)
                </label>
              )}
              {createError && <p className="muted">{createError}</p>}
            </div>
            {isTaskLoading && <p className="muted">Loading workflow tasks...</p>}
            {!isTaskLoading && taskError && <p className="muted">{taskError}</p>}
            {!isTaskLoading && !taskError && selectedMemberTaskGroups.length === 0 && (
              <p className="muted">No workflow tasks assigned.</p>
            )}
            {!isTaskLoading &&
              !taskError &&
              selectedMemberTaskGroups.map(([propertyLabel, propertyTasks]) => (
                <div key={propertyLabel} className="teamTaskPropertyGroup">
                  <h3>{propertyLabel}</h3>
                  <div className="teamTaskList">
                    {propertyTasks.map(({ task }) => (
                      <label className={`teamTaskRow${task.isComplete ? ' completed' : ''}`} key={task.id}>
                        <input
                          type="checkbox"
                          checked={!!task.isComplete}
                          disabled={updatingTaskIds.includes(task.id)}
                          aria-label={`Mark ${toTitleCase(task.stage?.trim() || 'task')} ${task.isComplete ? 'incomplete' : 'complete'} for ${propertyLabel}`}
                          onChange={(event) => {
                            void handleToggle(task, event.currentTarget.checked);
                          }}
                        />
                        <span className="teamTaskOrder">#{task.order ?? '—'}</span>
                        <span className="teamTaskStage">{toTitleCase(task.stage?.trim() || 'Unnamed task')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
          </section>
        </div>
      )}

      <style>{`
        .teamCard {
          border: 1px solid var(--border);
          background: var(--panel2);
          min-height: 132px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .teamCard:hover {
          background: var(--panel3);
          border-color: rgba(63, 185, 80, 0.35);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .teamNameButton {
          all: unset;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .teamName {
          font-size: 18px;
          font-weight: 800;
          color: var(--accent);
        }

        .teamTaskCount {
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
        }

        .teamPosition {
          color: var(--text);
          font-weight: 600;
        }

        .teamEmail {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
          word-break: break-word;
        }

        .teamEmail:hover {
          color: var(--accent-light);
          text-decoration: underline;
        }

        .teamTaskModalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 16px;
        }

        .teamTaskModal {
          width: min(760px, 100%);
          max-height: min(80vh, 760px);
          overflow: auto;
          background: var(--panel);
        }

        .teamTaskModal:hover {
          background: var(--panel);
          border-color: var(--border);
          box-shadow: none;
        }

        .teamTaskModalHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .teamTaskModalHeader h2 {
          margin: 0;
          font-size: 20px;
          color: var(--text);
        }

        .teamTaskModalSummary {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--muted);
        }

        .teamTaskComposer {
          display: grid;
          gap: 8px;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .teamTaskComposerRow {
          display: grid;
          gap: 8px;
          grid-template-columns: 2fr 1.5fr 1.5fr auto;
        }

        .teamTaskInput {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 13px;
          font-family: inherit;
          color: var(--text);
          background: var(--panel2);
          outline: none;
          transition: border-color 0.18s ease;
        }

        .teamTaskInput:focus {
          border-color: var(--accent);
        }

        .teamTaskCreateButton {
          border: 1px solid var(--border);
          background: var(--accent-dim);
          color: var(--accent);
          border-radius: 10px;
          padding: 8px 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.18s ease;
        }

        .teamTaskCreateButton:hover {
          background: var(--accent);
          color: #0d1117;
          border-color: var(--accent);
        }

        .teamTaskPersonalToggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
        }

        .teamTaskModalClose {
          border: 1px solid var(--border);
          background: var(--panel2);
          color: var(--muted);
          border-radius: 10px;
          padding: 6px 10px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.18s ease;
        }

        .teamTaskModalClose:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        .teamTaskPropertyGroup + .teamTaskPropertyGroup {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }

        .teamTaskPropertyGroup h3 {
          margin: 0 0 8px;
          color: var(--accent);
          font-size: 16px;
        }

        .teamTaskList {
          display: grid;
          gap: 8px;
        }

        .teamTaskRow {
          display: grid;
          grid-template-columns: auto auto 1fr;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--panel2);
          padding: 10px 12px;
          color: var(--text);
          transition: border-color 0.18s ease;
        }

        .teamTaskRow:hover {
          border-color: rgba(63, 185, 80, 0.30);
        }

        .teamTaskRow.completed {
          background: rgba(63, 185, 80, 0.05);
          color: var(--muted);
        }

        .teamTaskOrder {
          font-size: 12px;
          font-weight: 700;
          color: var(--accent);
        }

        .teamTaskRow.completed .teamTaskOrder,
        .teamTaskRow.completed .teamTaskStage {
          text-decoration: line-through;
        }

        .teamTaskStage {
          font-size: 14px;
          font-weight: 600;
        }
      `}</style>
    </>
  );
};

export default TeamPage;
