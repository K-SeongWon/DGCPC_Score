const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;
const DATA_FILE = './data.json';
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

app.use(express.json());
app.use(express.static('public'));

wss.on('connection', ws => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    ws.send(JSON.stringify({ type: 'INIT', data }));
});

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

app.get('/teams', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json(data);
});

app.post('/teams', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    const newTeamId = `team${data.teams.length + 1}`;
    const newTeam = { id: newTeamId, name: req.body.name, score: 0 };
    data.teams.push(newTeam);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(newTeam);
    broadcast({ type: 'TEAM_CREATED', data: newTeam });
});

app.put('/teams/:id', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    const team = data.teams.find(t => t.id === req.params.id);
    if (team) {
        team.name = req.body.name;
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json(team);
        broadcast({ type: 'TEAM_UPDATED', data: team });
    } else {
        res.status(404).send('Team not found');
    }
});

app.put('/teams/:id/score', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    const team = data.teams.find(t => t.id === req.params.id);
    if (team) {
        team.score += req.body.scoreChange;
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json(team);
        broadcast({ type: 'SCORE_UPDATED', data: team });
    } else {
        res.status(404).send('Team not found');
    }
});

app.delete('/teams/:id', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    const teamIndex = data.teams.findIndex(t => t.id === req.params.id);
    if (teamIndex !== -1) {
        const deletedTeam = data.teams.splice(teamIndex, 1)[0];
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ message: 'Team deleted' });
        broadcast({ type: 'TEAM_DELETED', data: deletedTeam });
    } else {
        res.status(404).send('Team not found');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
