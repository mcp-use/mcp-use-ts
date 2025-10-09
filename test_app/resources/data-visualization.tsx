import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

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
      <div style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Bar Chart</h3>
        <div style={{ display: 'flex', alignItems: 'end', gap: '10px', height: '300px' }}>
          {data.map((point, index) => (
            <div key={index} style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  background: point.color || '#3498db',
                  height: `${(point.value / maxValue) * 250}px`,
                  width: '100%',
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                title={`${point.label}: ${point.value}`}
              >
                <div style={{
                  position: 'absolute',
                  top: '-25px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                }}
                >
                  {point.value}
                </div>
              </div>
              <div style={{
                marginTop: '10px',
                fontSize: '12px',
                textAlign: 'center',
                color: '#7f8c8d',
                wordBreak: 'break-word',
              }}
              >
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
      <div style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Line Chart</h3>
        <svg width={width} height={height} style={{ border: '1px solid #ecf0f1', borderRadius: '8px' }}>
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
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="6"
              fill={data[index].color || '#3498db'}
              stroke="white"
              strokeWidth="2"
              style={{ cursor: 'pointer' }}
            >
              <title>{`${data[index].label}: ${data[index].value}`}</title>
            </circle>
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
      <div style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Pie Chart</h3>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          <svg width="300" height="300" style={{ border: '1px solid #ecf0f1', borderRadius: '8px' }}>
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
                <path
                  key={index}
                  d={pathData}
                  fill={point.color || '#3498db'}
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                >
                  <title>{`${point.label}: ${point.value} (${(percentage * 100).toFixed(1)}%)`}</title>
                </path>
              )
            })}
          </svg>

          <div style={{ flex: '1' }}>
            <h4 style={{ marginBottom: '15px', color: '#2c3e50' }}>Legend</h4>
            {data.map((point, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px',
                  padding: '8px',
                  background: '#f8f9fa',
                  borderRadius: '4px',
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  background: point.color || '#3498db',
                  borderRadius: '2px',
                  marginRight: '10px',
                }}
                />
                <span style={{ flex: '1', fontSize: '14px' }}>{point.label}</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#2c3e50',
                }}
                >
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
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Data Visualization</h1>

        {/* Controls */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }}
        >
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <label style={{ marginRight: '10px', fontWeight: 'bold', color: '#2c3e50' }}>Chart Type:</label>
              <select
                value={currentChartType}
                onChange={e => setCurrentChartType(e.target.value as typeof currentChartType)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Label"
              value={newDataPoint.label}
              onChange={e => setNewDataPoint({ ...newDataPoint, label: e.target.value })}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                minWidth: '120px',
              }}
            />
            <input
              type="number"
              placeholder="Value"
              value={newDataPoint.value}
              onChange={e => setNewDataPoint({ ...newDataPoint, value: Number(e.target.value) })}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                minWidth: '100px',
              }}
            />
            <button
              onClick={addDataPoint}
              style={{
                padding: '8px 16px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Add Data Point
            </button>
          </div>
        </div>

        {/* Chart */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
        >
          {data.length === 0
            ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#7f8c8d',
                  fontStyle: 'italic',
                }}
                >
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
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginTop: '20px',
            overflow: 'hidden',
          }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid #ecf0f1' }}>
              <h3 style={{ margin: '0', color: '#2c3e50' }}>Data Table</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ecf0f1' }}>Label</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ecf0f1' }}>Value</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ecf0f1' }}>Percentage</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ecf0f1' }}>Color</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ecf0f1' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((point, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '12px' }}>{point.label}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{point.value}</td>
                      <td style={{ padding: '12px' }}>
                        {((point.value / getTotalValue()) * 100).toFixed(1)}
                        %
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          background: point.color || '#3498db',
                          borderRadius: '2px',
                          display: 'inline-block',
                        }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => removeDataPoint(index)}
                          style={{
                            background: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
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
