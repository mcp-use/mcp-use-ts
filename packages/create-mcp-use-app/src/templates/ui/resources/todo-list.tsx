import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

interface Todo {
  id: string
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  category?: string
}

interface TodoListProps {
  initialTodos?: Todo[]
}

const TodoList: React.FC<TodoListProps> = ({ initialTodos = [] }) => {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [newTodo, setNewTodo] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'created'>('priority')

  // Load todos from URL parameters or use defaults
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const todosParam = urlParams.get('todos')

    if (todosParam) {
      try {
        const parsedTodos = JSON.parse(decodeURIComponent(todosParam))
        setTodos(parsedTodos)
      }
      catch (error) {
        console.error('Error parsing todos from URL:', error)
      }
    }
    else {
      // Default todos for demo
      setTodos([
        { id: '1', text: 'Complete project proposal', completed: false, priority: 'high', dueDate: '2024-01-15', category: 'Work' },
        { id: '2', text: 'Buy groceries', completed: false, priority: 'medium', dueDate: '2024-01-12', category: 'Personal' },
        { id: '3', text: 'Call dentist', completed: true, priority: 'low', category: 'Health' },
        { id: '4', text: 'Read React documentation', completed: false, priority: 'medium', category: 'Learning' },
        { id: '5', text: 'Plan weekend trip', completed: false, priority: 'low', dueDate: '2024-01-20', category: 'Personal' },
      ])
    }
  }, [])

  const addTodo = () => {
    if (newTodo.trim()) {
      const todo: Todo = {
        id: Date.now().toString(),
        text: newTodo,
        completed: false,
        priority: 'medium',
      }
      setTodos([...todos, todo])
      setNewTodo('')
    }
  }

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    ))
  }

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const updateTodoPriority = (id: string, priority: Todo['priority']) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, priority } : todo,
    ))
  }

  const getFilteredTodos = () => {
    let filtered = todos

    // Filter by status
    switch (filter) {
      case 'active':
        filtered = filtered.filter(todo => !todo.completed)
        break
      case 'completed':
        filtered = filtered.filter(todo => todo.completed)
        break
      default:
        break
    }

    // Sort todos
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'dueDate':
          if (!a.dueDate && !b.dueDate)
            return 0
          if (!a.dueDate)
            return 1
          if (!b.dueDate)
            return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        case 'created':
        default:
          return Number.parseInt(b.id) - Number.parseInt(a.id)
      }
    })
  }

  const _getPriorityColor = (priority: Todo['priority']) => {
    switch (priority) {
      case 'high': return '#e74c3c'
      case 'medium': return '#f39c12'
      case 'low': return '#27ae60'
      default: return '#95a5a6'
    }
  }

  const getPriorityIcon = (priority: Todo['priority']) => {
    switch (priority) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  const completedCount = todos.filter(todo => todo.completed).length
  const totalCount = todos.length
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Todo List</h1>

        {/* Progress bar */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>Progress</span>
            <span style={{ color: '#7f8c8d' }}>
              {completedCount}
              {' '}
              of
              {' '}
              {totalCount}
              {' '}
              completed
            </span>
          </div>
          <div style={{
            background: '#ecf0f1',
            borderRadius: '10px',
            height: '10px',
            overflow: 'hidden',
          }}
          >
            <div style={{
              background: 'linear-gradient(90deg, #27ae60, #2ecc71)',
              height: '100%',
              width: `${progressPercentage}%`,
              transition: 'width 0.3s ease',
            }}
            />
          </div>
        </div>

        {/* Add new todo */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }}
        >
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Add a new todo..."
              value={newTodo}
              onChange={e => setNewTodo(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addTodo()}
              style={{
                flex: '1',
                padding: '12px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
              }}
            />
            <button
              onClick={addTodo}
              style={{
                padding: '12px 24px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Filters and sorting */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }}
        >
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label style={{ marginRight: '10px', fontWeight: 'bold', color: '#2c3e50' }}>Filter:</label>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as typeof filter)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label style={{ marginRight: '10px', fontWeight: 'bold', color: '#2c3e50' }}>Sort by:</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <option value="priority">Priority</option>
                <option value="dueDate">Due Date</option>
                <option value="created">Created</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Todo list */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
      >
        {getFilteredTodos().map(todo => (
          <div
            key={todo.id}
            style={{
              padding: '20px',
              borderBottom: '1px solid #ecf0f1',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              background: todo.completed ? '#f8f9fa' : 'white',
            }}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer',
              }}
            />

            <div style={{ flex: '1' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '5px',
              }}
              >
                <span style={{
                  fontSize: '18px',
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  color: todo.completed ? '#7f8c8d' : '#2c3e50',
                }}
                >
                  {todo.text}
                </span>

                {todo.category && (
                  <span style={{
                    background: '#e9ecef',
                    color: '#495057',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  >
                    {todo.category}
                  </span>
                )}
              </div>

              {todo.dueDate && (
                <div style={{
                  fontSize: '14px',
                  color: '#7f8c8d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                >
                  📅 Due:
                  {' '}
                  {new Date(todo.dueDate).toLocaleDateString()}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={todo.priority}
                onChange={e => updateTodoPriority(todo.id, e.target.value as Todo['priority'])}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <span style={{ fontSize: '16px' }}>
                {getPriorityIcon(todo.priority)}
              </span>

              <button
                onClick={() => deleteTodo(todo.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e74c3c',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '5px',
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {getFilteredTodos().length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#7f8c8d',
            fontStyle: 'italic',
          }}
          >
            {filter === 'all'
              ? 'No todos yet. Add one above!'
              : filter === 'active'
                ? 'No active todos!'
                : 'No completed todos!'}
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
  root.render(<TodoList />)
}
