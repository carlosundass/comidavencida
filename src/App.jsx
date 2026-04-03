import Dashboard from './Dashboard'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
      <div className="w-full max-w-md min-h-screen bg-[#F4F6F8] shadow-2xl relative overflow-hidden sm:min-h-[90vh] sm:rounded-[2.5rem]">
        <Dashboard />
      </div>
    </div>
  )
}

export default App