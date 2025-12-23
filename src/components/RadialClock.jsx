import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

const RadialClock = ({ startDate }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const yearsGroupRef = useRef(null);
  const [now, setNow] = useState(new Date());
  const [yearsDrawn, setYearsDrawn] = useState(-1);

  // Calculate years (this doesn't change often)
  const years = useMemo(() => {
    const start = new Date(startDate);
    const diff = new Date() - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }, [startDate]);

  // Update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Draw year dots only once (or when years change)
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || years === yearsDrawn) return;

    const size = 130;
    const center = size / 2 + 5;

    const svg = d3.select(svgRef.current)
      .attr('width', size)
      .attr('height', size);

    // Remove old years group if exists
    svg.select('.years-group').remove();

    // Create years group
    const yearsGroup = svg.append('g')
      .attr('class', 'years-group')
      .attr('transform', `translate(${center},${center})`);

    yearsGroupRef.current = yearsGroup;

    // Create tooltip for year dots
    const yearTooltip = d3.select(containerRef.current)
      .selectAll('.year-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'year-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('border', '1px solid rgba(255, 255, 255, 0.2)')
      .style('border-radius', '4px')
      .style('padding', '6px 10px')
      .style('font-size', '11px')
      .style('font-family', 'JetBrains Mono, monospace')
      .style('color', '#fff')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('transition', 'opacity 0.15s ease')
      .style('z-index', 10)
      .style('white-space', 'nowrap');

    // Year dots config
    const yearDotRadius = 5;
    const yearDotSpacing = 14;
    const totalYearDotsWidth = (years - 1) * yearDotSpacing;
    const yearDotStartX = -totalYearDotsWidth / 2;

    const getFloatOffset = (i, seed) => {
      const val = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
      return (val - Math.floor(val)) * 2 - 1;
    };

    // Add CSS keyframes for floating animation if not already added
    if (!document.getElementById('year-dot-float-styles')) {
      const style = document.createElement('style');
      style.id = 'year-dot-float-styles';
      style.textContent = `
        @keyframes floatY0 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(2px, -3px); } }
        @keyframes floatY1 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(-3px, 2px); } }
        @keyframes floatY2 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(3px, 3px); } }
        @keyframes floatY3 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(-2px, -2px); } }
        @keyframes floatY4 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(1px, 3px); } }
        @keyframes floatY5 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(-3px, -1px); } }
        @keyframes floatY6 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(2px, -2px); } }
        @keyframes floatY7 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(-1px, 3px); } }
        @keyframes floatY8 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(3px, 1px); } }
        @keyframes floatY9 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(-2px, -3px); } }
        .year-dot { transition: r 0.15s ease, opacity 0.15s ease; }
        .year-dot:hover { r: 7; opacity: 1 !important; }
      `;
      document.head.appendChild(style);
    }

    for (let i = 0; i < years; i++) {
      const baseX = yearDotStartX + i * yearDotSpacing;
      const baseY = -58;
      const dotRadius = yearDotRadius + getFloatOffset(i, 3) * 1;
      const baseOpacity = 0.75 + getFloatOffset(i, 4) * 0.2;
      const animDuration = 3 + getFloatOffset(i, 5) * 1.5;
      const animDelay = getFloatOffset(i, 6) * -2;

      yearsGroup.append('circle')
        .attr('class', 'year-dot')
        .attr('cx', baseX)
        .attr('cy', baseY)
        .attr('r', dotRadius)
        .attr('fill', '#00d9ff')
        .attr('opacity', baseOpacity)
        .style('cursor', 'pointer')
        .style('filter', 'drop-shadow(0 0 3px rgba(0, 217, 255, 0.5))')
        .style('animation', `floatY${i % 10} ${animDuration}s ease-in-out ${animDelay}s infinite`)
        .on('mouseenter', function(event) {
          yearTooltip
            .html(`<span style="color: #00d9ff">year ${i + 1}</span>`)
            .style('left', `${event.offsetX + 10}px`)
            .style('top', `${event.offsetY - 10}px`)
            .style('opacity', 1);
        })
        .on('mouseleave', function() {
          yearTooltip.style('opacity', 0);
        });
    }

    setYearsDrawn(years);
  }, [years, yearsDrawn, startDate]);

  // Draw rings (updates every second)
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const size = 130;
    const center = size / 2 + 5;

    const svg = d3.select(svgRef.current)
      .attr('width', size)
      .attr('height', size);

    // Only remove the rings group, not the years group
    svg.select('.rings-group').remove();

    const g = svg.append('g')
      .attr('class', 'rings-group')
      .attr('transform', `translate(${center},${center})`);

    // Get current EST time for hours, minutes, seconds display
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = estTime.getHours();
    const minutes = estTime.getMinutes();
    const seconds = estTime.getSeconds();

    // Calculate elapsed time from start date (matching TimeCounter logic)
    const start = new Date(startDate);
    const diff = now - start;

    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
    const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));

    // Ring configuration (from outer to inner) - no years ring
    const rings = [
      {
        name: 'months',
        value: months,
        max: 12,
        radius: 45,
        width: 5,
        color: '#a78bfa'
      },
      {
        name: 'days',
        value: days,
        max: 31,
        radius: 38,
        width: 5,
        color: '#4ade80'
      },
      {
        name: 'hours (EST)',
        value: hours,
        max: 24,
        radius: 31,
        width: 5,
        color: '#fb923c'
      },
      {
        name: 'minutes (EST)',
        value: minutes,
        max: 60,
        radius: 24,
        width: 5,
        color: '#f472b6'
      },
      {
        name: 'seconds (EST)',
        value: seconds,
        max: 60,
        radius: 17,
        width: 5,
        color: '#fbbf24'
      }
    ];

    // Draw background rings
    rings.forEach(ring => {
      const arc = d3.arc()
        .innerRadius(ring.radius - ring.width)
        .outerRadius(ring.radius)
        .startAngle(0)
        .endAngle(2 * Math.PI);

      g.append('path')
        .attr('d', arc)
        .attr('fill', 'rgba(255, 255, 255, 0.05)');
    });

    // Create tooltip
    const tooltip = d3.select(containerRef.current)
      .selectAll('.radial-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'radial-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('border', '1px solid rgba(255, 255, 255, 0.2)')
      .style('border-radius', '4px')
      .style('padding', '6px 10px')
      .style('font-size', '11px')
      .style('font-family', 'JetBrains Mono, monospace')
      .style('color', '#fff')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('transition', 'opacity 0.15s ease')
      .style('z-index', 10)
      .style('white-space', 'nowrap');

    // Draw progress arcs
    rings.forEach(ring => {
      const arc = d3.arc()
        .innerRadius(ring.radius - ring.width)
        .outerRadius(ring.radius)
        .startAngle(0)
        .endAngle((ring.value / ring.max) * 2 * Math.PI)
        .cornerRadius(3);

      g.append('path')
        .attr('d', arc)
        .attr('fill', ring.color)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseenter', function(event) {
          d3.select(this).attr('opacity', 1);
          tooltip
            .html(`<span style="color: ${ring.color}">${ring.name}</span>: ${ring.value}/${ring.max}`)
            .style('left', `${event.offsetX + 10}px`)
            .style('top', `${event.offsetY - 10}px`)
            .style('opacity', 1);
        })
        .on('mousemove', function(event) {
          tooltip
            .style('left', `${event.offsetX + 10}px`)
            .style('top', `${event.offsetY - 10}px`);
        })
        .on('mouseleave', function() {
          d3.select(this).attr('opacity', 0.85);
          tooltip.style('opacity', 0);
        });
    });

  }, [now, startDate]);

  return (
    <div ref={containerRef} className="radial-clock-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default RadialClock;
