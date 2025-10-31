import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchJSON } from '../global.js';

document.addEventListener('DOMContentLoaded', async () => {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');
  const R = 50;
  const arc = d3.arc().innerRadius(0).outerRadius(R);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const projects = await fetchJSON('../lib/projects.json');

  const rolled = d3.rollups(projects, v => v.length, d => d.year);
  const data = rolled.map(([year, count]) => ({ label: year, value: count }));

  const pie = d3.pie().value(d => d.value);
  const arcData = pie(data);

  svg.selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arc)
    .attr('fill', (_, i) => colors(i))
    .attr('stroke', 'white')
    .attr('stroke-width', 1);

  legend.selectAll('li')
    .data(data)
    .join('li')
    .attr('style', (_, i) => `--color:${colors(i)}`)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
});



