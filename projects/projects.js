import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchJSON, renderProjects } from '../global.js';

document.addEventListener('DOMContentLoaded', async () => {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');
  const colors = d3.scaleOrdinal(d3.schemeTableau10);
  const arc = d3.arc().innerRadius(0).outerRadius(50);
  const pie = d3.pie().value(d => d.value);

  const projects = await fetchJSON('../lib/projects.json');
  const projectsContainer = document.querySelector('.projects');
  const searchInput = document.querySelector('.searchBar');

  let query = '';

  function filterProjects(list, q) {
    const term = q.toLowerCase();
    return list.filter(p =>
      Object.values(p).join('\n').toLowerCase().includes(term)
    );
  }

  function renderPieChart(list) {
    const rolled = d3.rollups(list, v => v.length, d => d.year);
    const data = rolled.map(([year, count]) => ({ label: year, value: count }));
    const arcData = pie(data);

    svg.selectAll('path').remove();
    legend.selectAll('*').remove();

    arcData.forEach((d, i) => {
      svg.append('path')
        .attr('d', arc(d))
        .attr('fill', colors(i))
        .attr('stroke', 'white');
    });

    legend.selectAll('li')
      .data(data)
      .join('li')
      .attr('style', (_, i) => `--color:${colors(i)}`)
      .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  }

  function updateAll() {
    const filtered = filterProjects(projects, query);
    renderProjects(filtered, projectsContainer, 'h2');
    renderPieChart(filtered);
  }

  searchInput.addEventListener('input', e => {
    query = e.target.value;
    updateAll();
  });

  updateAll();
});




