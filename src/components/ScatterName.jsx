import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const ScatterName = () => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Use ResizeObserver to track actual container width
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || containerWidth === 0) return;

    const width = containerWidth;
    const isMobile = width < 500;
    const height = isMobile ? 160 : 220;
    const margin = isMobile
      ? { top: 22, right: 25, bottom: 32, left: 40 }
      : { top: 28, right: 35, bottom: 40, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Create scales
    const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // Create main group with margins
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add gridlines
    const gridColor = 'rgba(255, 255, 255, 0.08)';

    // Vertical gridlines
    g.selectAll('.grid-v')
      .data(d3.range(0, 101, 20))
      .enter()
      .append('line')
      .attr('class', 'grid-v')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', '2,2');

    // Horizontal gridlines
    g.selectAll('.grid-h')
      .data(d3.range(0, 101, 20))
      .enter()
      .append('line')
      .attr('class', 'grid-h')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', '2,2');

    // Add axes
    const axisColor = 'rgba(255, 255, 255, 0.4)';
    const tickColor = 'rgba(255, 255, 255, 0.5)';

    // X axis (no ticks or labels)
    const xAxis = d3.axisBottom(xScale)
      .ticks(0)
      .tickSize(0);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call(g => g.select('.domain').attr('stroke', axisColor));

    // Y axis
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickSize(4)
      .tickFormat(d => d);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .call(g => g.select('.domain').attr('stroke', axisColor))
      .call(g => g.selectAll('.tick line').attr('stroke', axisColor))
      .call(g => g.selectAll('.tick text')
        .attr('fill', tickColor)
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace'));

    // Chart title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', isMobile ? 14 : 18)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-primary)')
      .attr('font-size', isMobile ? '12px' : '18px')
      .attr('font-weight', '600')
      .text('Director, Head of Advertiser Analytics');

    // X axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + (isMobile ? 26 : 32))
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--accent)')
      .attr('font-size', isMobile ? '12px' : '16px')
      .attr('font-weight', '700')
      .attr('text-transform', 'uppercase')
      .attr('letter-spacing', '0.15em')
      .text('MICROSOFT');

    // Generate points that spell "KEVIN KLEIN"
    const points = generateNamePoints('KEVIN KLEIN', innerWidth, innerHeight, xScale, yScale);

    // Create tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .attr('class', 'scatter-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.85)')
      .style('border', '1px solid rgba(255, 255, 255, 0.2)')
      .style('border-radius', '4px')
      .style('padding', '6px 10px')
      .style('font-size', '11px')
      .style('font-family', 'JetBrains Mono, monospace')
      .style('color', '#fff')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('transition', 'opacity 0.15s ease')
      .style('z-index', 10);

    // Create circles with random starting positions
    const circles = g.selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', () => Math.random() * innerWidth)
      .attr('cy', () => Math.random() * innerHeight)
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('opacity', 0)
      .style('cursor', 'pointer');

    // Animate to final positions
    circles.transition()
      .duration(1500)
      .delay((d, i) => i * 3)
      .ease(d3.easeCubicOut)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('opacity', d => d.opacity);

    // Add hover interactions after animation
    circles
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', d.size * 1.8);

        tooltip
          .html(`<div style="color: #888; font-size: 9px; margin-bottom: 3px;">Very important values...</div>x: ${d.dataX.toFixed(1)}, y: ${d.dataY.toFixed(1)}`)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`)
          .style('opacity', 1);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', d.size);

        tooltip.style('opacity', 0);
      });

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };

  }, [containerWidth]);

  return (
    <div ref={containerRef} className="scatter-name-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

// Letter definitions using a 5x7 grid pattern
const letterPatterns = {
  'K': [
    [1,0,0,0,1],
    [1,0,0,1,0],
    [1,0,1,0,0],
    [1,1,0,0,0],
    [1,0,1,0,0],
    [1,0,0,1,0],
    [1,0,0,0,1]
  ],
  'E': [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,1]
  ],
  'V': [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,0,1,0],
    [0,1,0,1,0],
    [0,0,1,0,0]
  ],
  'I': [
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [1,1,1,1,1]
  ],
  'N': [
    [1,0,0,0,1],
    [1,1,0,0,1],
    [1,0,1,0,1],
    [1,0,1,0,1],
    [1,0,0,1,1],
    [1,0,0,1,1],
    [1,0,0,0,1]
  ],
  'L': [
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,1]
  ],
  ' ': [
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0]
  ]
};

function generateNamePoints(name, width, height, xScale, yScale) {
  const points = [];
  const colors = ['#00d9ff', '#a78bfa', '#4ade80', '#fb923c', '#f472b6'];

  // Calculate total width of all letters
  let totalLetterWidth = 0;
  for (const char of name) {
    const pattern = letterPatterns[char];
    if (pattern) {
      totalLetterWidth += pattern[0].length + 1; // +1 for spacing
    }
  }
  totalLetterWidth -= 1; // Remove last spacing

  // Scale to fit width with small padding
  const padding = 10;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const dotSpacing = Math.min(availableWidth / totalLetterWidth, availableHeight / 7);

  // Center the text
  const actualWidth = totalLetterWidth * dotSpacing;
  let startX = (width - actualWidth) / 2;
  const startY = (height - 7 * dotSpacing) / 2;

  let currentX = startX;

  for (const char of name) {
    const pattern = letterPatterns[char];
    if (!pattern) continue;

    for (let row = 0; row < pattern.length; row++) {
      for (let col = 0; col < pattern[row].length; col++) {
        if (pattern[row][col] === 1) {
          // Add some randomness to positions for organic feel
          const jitterX = (Math.random() - 0.5) * 2;
          const jitterY = (Math.random() - 0.5) * 2;

          const pixelX = currentX + col * dotSpacing + jitterX;
          const pixelY = startY + row * dotSpacing + jitterY;

          points.push({
            x: pixelX,
            y: pixelY,
            dataX: xScale.invert(pixelX),
            dataY: yScale.invert(pixelY),
            size: 2 + Math.random() * 4, // Varied sizes between 2-6
            color: colors[Math.floor(Math.random() * colors.length)],
            opacity: 0.7 + Math.random() * 0.3
          });
        }
      }
    }

    currentX += (pattern[0].length + 1) * dotSpacing;
  }

  // Shuffle points for more interesting animation order
  return points.sort(() => Math.random() - 0.5);
}

export default ScatterName;
