import { ChatInterface } from "./components/ChatInterface";

function App() {
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg h-[700px] max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
        <ChatInterface />
      </div>
    </div>
  );
}

export default App;
