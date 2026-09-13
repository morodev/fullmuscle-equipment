interface RobotsGroup {
  agents: string[];
  disallow: string[];
  allow: string[];
}

export function assertAllowedByRobots(robotsText: string, urls: string[], userAgent: string): void {
  const groups = parseRobots(robotsText);
  const agentName = userAgent.toLowerCase().split(/[\s/(]/)[0] ?? '*';
  const applicable = groups.filter((group) =>
    group.agents.some((agent) => agent === '*' || agentName.includes(agent.toLowerCase())),
  );

  for (const value of urls) {
    const path = new URL(value).pathname;
    const rules = applicable.flatMap((group) => [
      ...group.disallow.map((pattern) => ({ pattern, allowed: false })),
      ...group.allow.map((pattern) => ({ pattern, allowed: true })),
    ]);
    const matching = rules
      .filter((rule) => rule.pattern && path.startsWith(rule.pattern))
      .sort((a, b) => b.pattern.length - a.pattern.length);
    if (matching[0]?.allowed === false) {
      throw new Error(`robots.txt non consente il percorso ${path}`);
    }
  }
}

function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | undefined;
  for (const originalLine of text.split(/\r?\n/)) {
    const line = originalLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === 'user-agent') {
      if (!current || current.disallow.length || current.allow.length) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && key === 'disallow') {
      current.disallow.push(value);
    } else if (current && key === 'allow') {
      current.allow.push(value);
    }
  }
  return groups;
}
