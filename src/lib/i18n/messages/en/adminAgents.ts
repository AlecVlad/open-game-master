// English, the source language: player agents' webhook receivers in the admin panel.
export const enAdminAgents = {
  "admin.agents.err.save": "Could not save the player agent settings.",
  "admin.agents.err.network": "Could not reach the server.",
  "admin.agents.loading": "Loading receiver addresses",
  "admin.agents.intro": "A player can seat their own agent at a table and have it woken on its turn by a small receiver on their computer (Settings > Connected agents). This server sends only to the HTTPS addresses listed here. Add one only for a receiver you trust: it lets the server make requests to that host.",
  "admin.agents.empty": "No receiver addresses yet, so no player agent is sent a webhook.",
  "admin.agents.fromEnv": "from {name}",
  "admin.agents.remove": "Remove",
  "admin.agents.address": "Receiver address",
  "admin.agents.allow": "Allow",
  "admin.agents.poll.label": "Allow poll links",
  "admin.agents.poll.hint": "For an agent nothing can send requests to (a hosted assistant whose hooks can only check a URL): its player gets a secret link that says when their character has something to do. The server sends nothing; anyone holding the link can see that much. It stops when the player replaces or removes it or revokes the connection. Turning this off deletes every link.",
} satisfies Record<string, string>;
