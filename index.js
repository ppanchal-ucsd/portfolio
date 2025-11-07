import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const projects = await fetchJSON('./lib/projects.json');
renderProjects(projects.slice(0, 3), document.querySelector('.projects'), 'h2');

const USERNAME = 'ppanchal-ucsd';

async function showGitHubStats() {
  let statsEl = document.getElementById('profile-stats');
  if (!statsEl) {
    statsEl = document.createElement('div');
    statsEl.id = 'profile-stats';
    document.body.appendChild(statsEl);
  }

  try {
    const gh = await fetchGitHubData(USERNAME);
    statsEl.innerHTML = `
      <dl>
        <dt>Name</dt><dd>${gh.name ?? USERNAME}</dd>
        <dt>Public Repos</dt><dd>${gh.public_repos ?? 0}</dd>
        <dt>Public Gists</dt><dd>${gh.public_gists ?? 0}</dd>
        <dt>Followers</dt><dd>${gh.followers ?? 0}</dd>
        <dt>Following</dt><dd>${gh.following ?? 0}</dd>
      </dl>
    `;
  } catch (err) {
    const msg = err?.message ?? String(err);
    console.error('GitHub fetch failed:', err);
    statsEl.textContent = `Could not load GitHub stats: ${msg}`;

    if (/404/.test(msg)) {
      try {
        const gh = await fetchGitHubData('octocat');
        statsEl.innerHTML = `
          <p>(Fallback shown for sanity check — your code works.)</p>
          <dl>
            <dt>Name</dt><dd>${gh.name ?? 'octocat'}</dd>
            <dt>Public Repos</dt><dd>${gh.public_repos ?? 0}</dd>
            <dt>Public Gists</dt><dd>${gh.public_gists ?? 0}</dd>
            <dt>Followers</dt><dd>${gh.followers ?? 0}</dd>
            <dt>Following</dt><dd>${gh.following ?? 0}</dd>
          </dl>
        `;
      } catch {}
    }
  }
}

showGitHubStats();


