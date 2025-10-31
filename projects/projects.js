
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

document.addEventListener('DOMContentLoaded', () => {
  const svg = d3.select('#projects-pie-plot');
  if (svg.empty()) return;

  const R = 50; 
  const arc = d3.arc().innerRadius(0).outerRadius(R);

  const data = [1, 2]; 
  const pie = d3.pie(); 
  const arcData = pie(data);

  const colors = ['gold', 'purple'];

  svg.selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arc)
    .attr('fill', (_, i) => colors[i])
    .attr('stroke', 'white')
    .attr('stroke-width', 1);
});

