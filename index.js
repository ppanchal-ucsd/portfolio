import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);

const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');

const USERNAME = 'ppanchal-ucsd'; 
try {
  const gh = await fetchGitHubData(USERNAME);
  const statsEl = document.getElementById('profile-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <dl>
        <dt>Name</dt><dd>${gh.name ?? USERNAME}</dd>
        <dt>Public Repos</dt><dd>${gh.public_repos}</dd>
        <dt>Public Gists</dt><dd>${gh.public_gists}</dd>
        <dt>Followers</dt><dd>${gh.followers}</dd>
        <dt>Following</dt><dd>${gh.following}</dd>
      </dl>
    `;
  }
} catch (err) {
  console.error('GitHub fetch failed:', err);
  const statsEl = document.getElementById('profile-stats');
  if (statsEl) statsEl.textContent = 'Could not load GitHub stats.';
}

