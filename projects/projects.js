import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchJSON, renderProjects } from '../global.js';

document.addEventListener('DOMContentLoaded', async () => {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');
  const projectsContainer = document.querySelector('.projects');
  const searchInput = document.querySelector('.searchBar');

  const colors = d3.scaleOrdinal(d3.schemeTableau10);
  const arc = d3.arc().innerRadius(0).outerRadius(50);
  const pie = d3.pie().value(d => d.value); 

  const projects = await fetchJSON('../lib/projects.json');

  let query = '';
  let selectedYear = null; 

  function filterProjectsByQuery(list, q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(p => Object.values(p).join('\n').toLowerCase().includes(needle));
  }

  function groupByYear(list) {
    const rolled = d3.rollups(list, v => v.length, d => String(d.year));
    rolled.sort((a, b) => Number(b[0]) - Number(a[0]));
    return rolled.map(([label, value]) => ({ label, value }));
  }

  function renderPieAndLegend(sourceList) {
    const data = groupByYear(sourceList);
    const arcData = pie(data);

    if (selectedYear && !data.some(d => d.label === selectedYear)) {
      selectedYear = null;
    }

    svg.selectAll('path').remove();
    legend.selectAll('*').remove();

    svg.selectAll('path')
      .data(arcData)
      .join('path')
      .attr('d', d => arc(d))
      .attr('fill', (_, i) => colors(i))
      .classed('selected', (d, i) => data[i].label === selectedYear)
      .on('click', (e, d) => {
        const yr = data[d.index].label;
        selectedYear = (selectedYear === yr) ? null : yr;
        updateAll(); 
      });

    legend.selectAll('li')
      .data(data)
      .join('li')
      .attr('style', (_, i) => `--color:${colors(i)}`)
      .classed('selected', d => d.label === selectedYear)
      .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', (_, d) => {
        selectedYear = (selectedYear === d.label) ? null : d.label;
        updateAll();
      });
  }

  function updateAll() {
    const byQuery = filterProjectsByQuery(projects, query);

    const byQueryAndSelection = selectedYear
      ? byQuery.filter(p => String(p.year) === selectedYear)
      : byQuery;

    renderProjects(byQueryAndSelection, projectsContainer, 'h2');

    renderPieAndLegend(byQuery);
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      query = e.target.value;
      updateAll();
    });
  }

  updateAll();
});





