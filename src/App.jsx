import Dashboard from './Dashboard'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      {/* Simula la pantalla de un celular en PC */}
      <div className="w-full max-w-md shadow-2xl min-h-screen bg-white">
        <Dashboard />
      </div>
    </div>
  )
}

export default App