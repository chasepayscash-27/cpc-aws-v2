import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';
import { loadCsv } from '../utils/csv';
import type { ProjectRow } from '../types/project';
import { getPrimaryTasksAcrossProperties } from '../components/propertyTaskCollections';
import { usePropertyTasks } from '../contexts/PropertyTasksContext';
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

interface TeamTaskView {
  task: PropertyTask;
  propertyLabel: string;
}

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

const TeamPage = () => {
  const { allTasks, isLoading: isTaskLoading, error: contextTaskError, updateTaskCompletion } = usePropertyTasks();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projectLookup, setProjectLookup] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggleError, setToggleError] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [completedByUser, setCompletedByUser] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);

  const taskError = contextTaskError || toggleError;
  const tasks = useMemo(() => getPrimaryTasksAcrossProperties(allTasks), [allTasks]);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        const identifier = user.signInDetails?.loginId ?? user.username ?? user.userId;
        setCompletedByUser(identifier ?? null);
      })
      .catch(() => setCompletedByUser(null));
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

  const tasksByMember = useMemo(() => {
    const map = new Map<string, TeamTaskView[]>();
    for (const member of teamMembers) {
      const memberTasks = tasks
        .filter((task) => isTaskAssignedToEmployee(task.assigneeId?.trim() || '', member.name))
        .map((task) => {
          const propertyId = task.propertyId?.trim() || '';
          return {
            task,
            propertyLabel: (projectLookup.get(propertyId) ?? propertyId) || 'Unknown property',
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
  }, [projectLookup, teamMembers, tasks]);

  const selectedMemberTasks = useMemo(
    () => (selectedMember ? tasksByMember.get(selectedMember.name) ?? [] : []),
    [selectedMember, tasksByMember]
  );

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
              <button className="teamNameButton" onClick={() => setSelectedMember(member)}>
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
                          aria-label={`Mark ${task.stage?.trim() || 'task'} ${task.isComplete ? 'incomplete' : 'complete'} for ${propertyLabel}`}
                          onChange={(event) => {
                            void handleToggle(task, event.currentTarget.checked);
                          }}
                        />
                        <span className="teamTaskOrder">#{task.order ?? '—'}</span>
                        <span className="teamTaskStage">{task.stage?.trim() || 'Unnamed task'}</span>
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
          border: 1px solid rgba(26, 122, 60, 0.25);
          background: linear-gradient(135deg, rgba(26, 122, 60, 0.08), rgba(40, 168, 82, 0.04));
          min-height: 132px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .teamCard:hover {
          background: linear-gradient(135deg, rgba(26, 122, 60, 0.14), rgba(40, 168, 82, 0.08));
          border-color: rgba(26, 122, 60, 0.40);
          box-shadow: 0 4px 12px rgba(26, 122, 60, 0.12);
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
          color: #1a7a3c;
        }

        .teamTaskCount {
          font-size: 12px;
          font-weight: 600;
          color: #5a7060;
        }

        .teamPosition {
          color: #1a2e1a;
          font-weight: 600;
        }

        .teamEmail {
          color: #1a7a3c;
          text-decoration: none;
          font-weight: 600;
          word-break: break-word;
        }

        .teamEmail:hover {
          color: #28a852;
          text-decoration: underline;
        }

        .teamTaskModalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(17, 24, 39, 0.45);
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
          background: #ffffff;
        }

        .teamTaskModal:hover {
          background: #ffffff;
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
          color: #1a2e1a;
        }

        .teamTaskModalSummary {
          margin: 4px 0 0;
          font-size: 12px;
          color: #5a7060;
        }

        .teamTaskModalClose {
          border: 1px solid rgba(26, 122, 60, 0.3);
          background: #f0f7f1;
          color: #1a7a3c;
          border-radius: 10px;
          padding: 6px 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .teamTaskPropertyGroup + .teamTaskPropertyGroup {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(26, 122, 60, 0.18);
        }

        .teamTaskPropertyGroup h3 {
          margin: 0 0 8px;
          color: #1a7a3c;
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
          border: 1px solid rgba(26, 122, 60, 0.18);
          border-radius: 10px;
          background: #ffffff;
          padding: 10px 12px;
          color: #1a2e1a;
        }

        .teamTaskRow.completed {
          background: #f5faf6;
          color: #5a7060;
        }

        .teamTaskOrder {
          font-size: 12px;
          font-weight: 700;
          color: #1a7a3c;
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
