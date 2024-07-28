const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3001';
let ws;

// 전광판 페이지 초기화
function initializeScoreboard() {
    ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };

    fetch(`${API_URL}/teams`)
        .then(response => response.json())
        .then(data => {
            const scoreboard = document.getElementById('scoreboard');
            scoreboard.innerHTML = '';
            data.teams.forEach(team => {
                const teamDiv = document.createElement('div');
                teamDiv.classList.add('team');
                teamDiv.dataset.id = team.id;
                teamDiv.innerHTML = `<h2>${team.name}</h2><p>Score: ${team.score}</p>`;
                scoreboard.appendChild(teamDiv);
            });
        });
}

function handleWebSocketMessage(message) {
    const scoreboard = document.getElementById('scoreboard');
    switch (message.type) {
        case 'INIT':
            scoreboard.innerHTML = '';
            message.data.teams.forEach(team => {
                const teamDiv = document.createElement('div');
                teamDiv.classList.add('team');
                teamDiv.dataset.id = team.id;
                teamDiv.innerHTML = `<h2>${team.name}</h2><p>Score: ${team.score}</p>`;
                scoreboard.appendChild(teamDiv);
            });
            break;
        case 'TEAM_CREATED':
            const teamDiv = document.createElement('div');
            teamDiv.classList.add('team');
            teamDiv.dataset.id = message.data.id;
            teamDiv.innerHTML = `<h2>${message.data.name}</h2><p>Score: ${message.data.score}</p>`;
            scoreboard.appendChild(teamDiv);
            break;
        case 'TEAM_UPDATED':
            const updatedTeamElements = scoreboard.querySelectorAll('.team');
            updatedTeamElements.forEach(teamElement => {
                if (teamElement.dataset.id === message.data.id) {
                    teamElement.querySelector('h2').textContent = message.data.name;
                }
            });
            break;
        case 'SCORE_UPDATED':
            const scoreUpdatedElements = scoreboard.querySelectorAll('.team');
            scoreUpdatedElements.forEach(teamElement => {
                if (teamElement.dataset.id === message.data.id) {
                    teamElement.querySelector('p').textContent = `Score: ${message.data.score}`;
                }
            });
            break;
        case 'TEAM_DELETED':
            const deletedTeamElements = scoreboard.querySelectorAll('.team');
            deletedTeamElements.forEach(teamElement => {
                if (teamElement.dataset.id === message.data.id) {
                    teamElement.remove();
                }
            });
            break;
    }
}

// 관리자 페이지 초기화
function initializeAdmin() {
    fetch(`${API_URL}/teams`)
        .then(response => response.json())
        .then(data => {
            const teamsDiv = document.getElementById('teams');
            teamsDiv.innerHTML = '';
            data.teams.forEach(team => createTeamElement(team, teamsDiv));
        });
}

function createTeamElement(team, parentElement) {
    const teamDiv = document.createElement('div');
    teamDiv.classList.add('team');
    teamDiv.dataset.id = team.id;
    teamDiv.innerHTML = `
        <input type="text" value="${team.name}" id="team-name-${team.id}">
        <button onclick="updateTeamName('${team.id}')">Done</button>
        <button onclick="deleteTeam('${team.id}')">Delete</button>
        <div>
            <button onclick="updateTeamScore('${team.id}', -parseInt(document.getElementById('score-${team.id}').value))">-</button>
            <input type="number" id="score-${team.id}" value="0">
            <button onclick="updateTeamScore('${team.id}', parseInt(document.getElementById('score-${team.id}').value))">+</button>
        </div>
        <p>Score: <span id="team-score-${team.id}">${team.score}</span></p>
    `;
    parentElement.appendChild(teamDiv);
}

function createTeam() {
    const teamName = document.getElementById('teamName').value;
    fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: teamName })
    })
        .then(response => response.json())
        .then(team => {
            const teamsDiv = document.getElementById('teams');
            createTeamElement(team, teamsDiv);
            document.getElementById('teamName').value = '';
            ws.send(JSON.stringify({ type: 'TEAM_CREATED', data: team }));
        });
}

function updateTeamName(id) {
    const name = document.getElementById(`team-name-${id}`).value;
    fetch(`${API_URL}/teams/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
    })
        .then(response => response.json())
        .then(team => {
            ws.send(JSON.stringify({ type: 'TEAM_UPDATED', data: team }));
        });
}

function updateTeamScore(id, scoreChange) {
    fetch(`${API_URL}/teams/${id}/score`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scoreChange })
    })
        .then(response => response.json())
        .then(team => {
            document.getElementById(`team-score-${team.id}`).textContent = team.score;
            ws.send(JSON.stringify({ type: 'SCORE_UPDATED', data: team }));  // 전광판 페이지 갱신
        });
}

function deleteTeam(id) {
    if (confirm('Are you sure you want to delete this team?')) {
        fetch(`${API_URL}/teams/${id}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(() => {
                const teamDiv = document.querySelector(`.team[data-id="${id}"]`);
                teamDiv.remove();
                ws.send(JSON.stringify({ type: 'TEAM_DELETED', data: { id: id } }));  // 전광판 페이지 갱신
            });
    }
}
