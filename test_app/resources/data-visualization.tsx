import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

// CSS styles for dynamic colors
const dynamicStyles = `
  .dynamic-bar {
    background-color: var(--dynamic-color, #3498db);
    height: var(--dynamic-height, 100px);
  }
  .dynamic-color {
    background-color: var(--dynamic-color, #3498db);
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = dynamicStyles
  document.head.appendChild(styleElement)
}

interface DataPoint {
  label: string
  value: number
  color?: string
}

interface DataVisualizationProps {
  initialData?: DataPoint[]
  chartType?: 'bar' | 'line' | 'pie'
}

const DataVisualization: React.FC<DataVisualizationProps> = ({
  initialData = [],
  chartType = 'bar',
}) => {
  const [data, setData] = useState<DataPoint[]>(initialData)
  const [currentChartType, setCurrentChartType] = useState<'bar' | 'line' | 'pie'>(chartType)
  const [newDataPoint, setNewDataPoint] = useState({ label: '', value: 0 })

  // Load data from URL parameters or use defaults
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const dataParam = urlParams.get('data')
    const typeParam = urlParams.get('chartType')

    if (dataParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(dataParam))
        setData(parsedData)
      }
      catch (error) {
        console.error('Error parsing data from URL:', error)
      }
    }
    else {
      // Default data for demo
      setData([
        { label: 'January', value: 65, color: '#3498db' },
        { label: 'February', value: 59, color: '#e74c3c' },
        { label: 'March', value: 80, color: '#2ecc71' },
        { label: 'April', value: 81, color: '#f39c12' },
        { label: 'May', value: 56, color: '#9b59b6' },
        { label: 'June', value: 55, color: '#1abc9c' },
      ])
    }

    if (typeParam) {
      setCurrentChartType(typeParam as 'bar' | 'line' | 'pie')
    }
  }, [])

  const addDataPoint = () => {
    if (newDataPoint.label.trim() && newDataPoint.value > 0) {
      const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22']
      const newPoint: DataPoint = {
        ...newDataPoint,
        color: colors[data.length % colors.length],
      }
      setData([...data, newPoint])
      setNewDataPoint({ label: '', value: 0 })
    }
  }

  const removeDataPoint = (index: number) => {
    setData(data.filter((_, i) => i !== index))
  }

  const getMaxValue = () => {
    return Math.max(...data.map(d => d.value), 0)
  }

  const getTotalValue = () => {
    return data.reduce((sum, d) => sum + d.value, 0)
  }

  const renderBarChart = () => {
    const maxValue = getMaxValue()

    return (
      <div className="p-5">
        <h3 className="mb-5 text-slate-700">Bar Chart</h3>
        <div className="flex items-end gap-2.5 h-75">
          {data.map((point, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full rounded-t transition-all duration-300 cursor-pointer relative dynamic-bar"
                style={{
                  '--dynamic-color': point.color || '#3498db',
                  '--dynamic-height': `${(point.value / maxValue) * 250}px`,
                } as React.CSSProperties}
                title={`${point.label}: ${point.value}`}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap">
                  {point.value}
                </div>
              </div>
              <div className="mt-2.5 text-xs text-center text-slate-500 break-words">
                {point.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderLineChart = () => {
    const maxValue = getMaxValue()
    const width = 600
    const height = 300
    const padding = 40

    const points = data.map((point, index) => ({
      x: padding + (index * (width - 2 * padding)) / (data.length - 1),
      y: padding + ((maxValue - point.value) / maxValue) * (height - 2 * padding),
    }))

    const pathData = points.map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
    ).join(' ')

    return (
      <div className="p-5">
        <h3 className="mb-5 text-slate-700">Line Chart</h3>
        <svg width={width} height={height} className="border border-slate-200 rounded-lg">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <line
              key={ratio}
              x1={padding}
              y1={padding + ratio * (height - 2 * padding)}
              x2={width - padding}
              y2={padding + ratio * (height - 2 * padding)}
              stroke="#ecf0f1"
              strokeWidth="1"
            />
          ))}

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3498db"
            strokeWidth="3"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill={data[index].color || '#3498db'}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer"
              />
              <title>{`${data[index].label}: ${data[index].value}`}</title>
            </g>
          ))}

          {/* Labels */}
          {data.map((point, index) => (
            <text
              key={index}
              x={padding + (index * (width - 2 * padding)) / (data.length - 1)}
              y={height - 10}
              textAnchor="middle"
              fontSize="12"
              fill="#7f8c8d"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    )
  }

  const renderPieChart = () => {
    const total = getTotalValue()
    let currentAngle = 0

    return (
      <div className="p-5">
        <h3 className="mb-5 text-slate-700">Pie Chart</h3>
        <div className="flex gap-10 items-center">
          <svg width="300" height="300" className="border border-slate-200 rounded-lg">
            {data.map((point, index) => {
              const percentage = point.value / total
              const angle = percentage * 360
              const startAngle = currentAngle
              const endAngle = currentAngle + angle
              currentAngle += angle

              const centerX = 150
              const centerY = 150
              const radius = 120

              const startAngleRad = (startAngle - 90) * (Math.PI / 180)
              const endAngleRad = (endAngle - 90) * (Math.PI / 180)

              const x1 = centerX + radius * Math.cos(startAngleRad)
              const y1 = centerY + radius * Math.sin(startAngleRad)
              const x2 = centerX + radius * Math.cos(endAngleRad)
              const y2 = centerY + radius * Math.sin(endAngleRad)

              const largeArcFlag = angle > 180 ? 1 : 0

              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z',
              ].join(' ')

              return (
                <g key={index}>
                  <path
                    d={pathData}
                    fill={point.color || '#3498db'}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer"
                  />
                  <title>{`${point.label}: ${point.value} (${(percentage * 100).toFixed(1)}%)`}</title>
                </g>
              )
            })}
          </svg>

          <div className="flex-1">
            <h4 className="mb-4 text-slate-700">Legend</h4>
            {data.map((point, index) => (
              <div
                key={index}
                className="flex items-center mb-2 p-2 bg-slate-50 rounded"
              >
                <div 
                  className="w-4 h-4 rounded-sm mr-2.5 dynamic-color"
                  style={{
                    '--dynamic-color': point.color || '#3498db',
                  } as React.CSSProperties}
                />
                <span className="flex-1 text-sm">{point.label}</span>
                <span className="text-sm font-bold text-slate-700">
                  {point.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5">
      <div className="mb-8">
        <h1 className="m-0 mb-5 text-slate-700">Data Visualization</h1>

        {/* Controls */}
        <div className="bg-white p-5 rounded-lg shadow-sm mb-5">
          <div className="flex gap-5 flex-wrap items-center mb-5">
            <div>
              <label className="mr-2.5 font-bold text-slate-700">Chart Type:</label>
              <select
                value={currentChartType}
                onChange={e => setCurrentChartType(e.target.value as typeof currentChartType)}
                className="px-3 py-2 border border-gray-300 rounded"
                aria-label="Select chart type"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2.5 flex-wrap items-center">
            <input
              type="text"
              placeholder="Label"
              value={newDataPoint.label}
              onChange={e => setNewDataPoint({ ...newDataPoint, label: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded min-w-30"
            />
            <input
              type="number"
              placeholder="Value"
              value={newDataPoint.value}
              onChange={e => setNewDataPoint({ ...newDataPoint, value: Number(e.target.value) })}
              className="px-3 py-2 border border-gray-300 rounded min-w-25"
            />
            <button
              onClick={addDataPoint}
              className="px-4 py-2 bg-blue-500 text-white border-none rounded cursor-pointer"
            >
              Add Data Point
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {data.length === 0
            ? (
                <div className="text-center py-10 px-5 text-slate-500 italic">
                  No data to visualize. Add some data points above!
                </div>
              )
            : (
                <>
                  {currentChartType === 'bar' && renderBarChart()}
                  {currentChartType === 'line' && renderLineChart()}
                  {currentChartType === 'pie' && renderPieChart()}
                </>
              )}
        </div>

        {/* Data table */}
        {data.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm mt-5 overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="m-0 text-slate-700">Data Table</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-3 text-left border-b border-slate-200">Label</th>
                    <th className="p-3 text-left border-b border-slate-200">Value</th>
                    <th className="p-3 text-left border-b border-slate-200">Percentage</th>
                    <th className="p-3 text-left border-b border-slate-200">Color</th>
                    <th className="p-3 text-left border-b border-slate-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((point, index) => (
                    <tr key={index} className="border-b border-slate-200">
                      <td className="p-3">{point.label}</td>
                      <td className="p-3 font-bold">{point.value}</td>
                      <td className="p-3">
                        {((point.value / getTotalValue()) * 100).toFixed(1)}
                        %
                      </td>
                      <td className="p-3">
                        <div 
                          className="w-5 h-5 rounded-sm inline-block dynamic-color"
                          style={{
                            '--dynamic-color': point.color || '#3498db',
                          } as React.CSSProperties}
                        />
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => removeDataPoint(index)}
                          className="bg-red-500 text-white border-none rounded px-2 py-1 cursor-pointer text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Mount the component
const container = document.getElementById('widget-root')
if (container) {
  const root = createRoot(container)
  root.render(<DataVisualization />)
}
