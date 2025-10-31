import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

document.addEventListener('DOMContentLoaded', () => {
  const svg = d3.select('#projects-pie-plot');
  if (svg.empty()) return;

  const R = 50;
  const arc = d3.arc().innerRadius(0).outerRadius(R);

  const data = [
    { value: 1, label: 'apples' },
    { value: 2, label: 'oranges' },
    { value: 3, label: 'mangos' },
    { value: 4, label: 'pears' },
    { value: 5, label: 'limes' },
    { value: 5, label: 'cherries' },
  ];

  const pie = d3.pie().value(d => d.value);
  const arcData = pie(data);

  const colors = d3.scaleOrdinal(d3.schemeTableau10); 
  svg.selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arc)
    .attr('fill', (_, i) => colors(i))
    .attr('stroke', 'white')
    .attr('stroke-width', 1);

  const legend = d3.select('.legend');
  legend.selectAll('li')
    .data(data)
    .join('li')
    .attr('style', (_, i) => `--color:${colors(i)}`)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
});


