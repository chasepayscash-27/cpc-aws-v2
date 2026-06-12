import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { loadCsv } from '../utils/csv';
import type { ProjectRow } from '../types/project';
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

interface OutstandingTask {
  id: string;
  order: number | null;
  stage: string;
  propertyId: string;
  propertyLabel: string;
  assigneeId: string;
}

const client = generateClient<Schema>();

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

async function listAllPropertyTasks(): Promise<PropertyTask[]> {
  const allTasks: PropertyTask[] = [];
  let nextToken: string | null | undefined;

  do {
    const { data, nextToken: newToken } = await client.models.PropertyTask.list({
      limit: 1000,
      nextToken,
    });
    allTasks.push(...(data ?? []));
    nextToken = newToken;
  } while (nextToken);

  return allTasks;
}

const TeamPage = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<OutstandingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskLoading, setIsTaskLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskError, setTaskError] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      loadCsv<TeamCsvRow>('/data/cpc_job_titles.csv'),
      loadCsv<ProjectRow>('/data/projects_v2.csv'),
      listAllPropertyTasks(),
    ])
      .then(([teamRows, projectRows, propertyTasks]) => {
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
        setIsLoading(false);

        const projectLookup = buildProjectLookup(projectRows);
        const outstanding = propertyTasks
          .filter((task) => !task.isComplete)
          .map((task) => {
            const propertyId = task.propertyId?.trim() || '';
            return {
              id: task.id,
              order: task.order ?? null,
              stage: task.stage?.trim() || 'Unnamed task',
              propertyId,
              propertyLabel: projectLookup.get(propertyId) ?? propertyId || 'Unknown property',
              assigneeId: task.assigneeId?.trim() || '',
            };
          })
          .filter((task) => task.assigneeId);
        setTasks(outstanding);
        setIsTaskLoading(false);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setIsLoading(false);
        setIsTaskLoading(false);
        const message = loadError instanceof Error ? loadError.message : 'Failed to load team data.';
        if (message.toLowerCase().includes('propertytask')) {
          setTaskError('Unable to load workflow tasks.');
        } else {
          setError('Unable to load team member data.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const tasksByMember = useMemo(() => {
    const map = new Map<string, OutstandingTask[]>();
    for (const member of teamMembers) {
      const memberTasks = tasks
        .filter((task) => isTaskAssignedToEmployee(task.assigneeId, member.name))
        .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
      map.set(member.name, memberTasks);
    }
    return map;
  }, [teamMembers, tasks]);

  const selectedMemberTasks = selectedMember ? tasksByMember.get(selectedMember.name) ?? [] : [];

  const selectedMemberTaskGroups = useMemo(() => {
    const groups = new Map<string, OutstandingTask[]>();
    for (const task of selectedMemberTasks) {
      const existing = groups.get(task.propertyLabel) ?? [];
      existing.push(task);
      groups.set(task.propertyLabel, existing);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [selectedMemberTasks]);

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
                <span className="teamTaskCount">{tasksByMember.get(member.name)?.length ?? 0} outstanding</span>
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
          <section className="teamTaskModal card" role="dialog" aria-modal="true" aria-label={`Outstanding tasks for ${selectedMember.name}`} onClick={(event) => event.stopPropagation()}>
            <div className="teamTaskModalHeader">
              <h2>{selectedMember.name} — Outstanding Task List</h2>
              <button type="button" className="teamTaskModalClose" onClick={() => setSelectedMember(null)}>
                Close
              </button>
            </div>
            {isTaskLoading && <p className="muted">Loading workflow tasks...</p>}
            {!isTaskLoading && taskError && <p className="muted">{taskError}</p>}
            {!isTaskLoading && !taskError && selectedMemberTaskGroups.length === 0 && (
              <p className="muted">No outstanding workflow tasks assigned.</p>
            )}
            {!isTaskLoading &&
              !taskError &&
              selectedMemberTaskGroups.map(([propertyLabel, propertyTasks]) => (
                <div key={propertyLabel} className="teamTaskPropertyGroup">
                  <h3>{propertyLabel}</h3>
                  <ul>
                    {propertyTasks.map((task) => (
                      <li key={task.id}>
                        #{task.order ?? '—'} {task.stage}
                      </li>
                    ))}
                  </ul>
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

        .teamTaskPropertyGroup ul {
          margin: 0;
          padding-left: 20px;
          color: #1a2e1a;
        }
      `}</style>
    </>
  );
};

export default TeamPage;
