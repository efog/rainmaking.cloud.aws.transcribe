import './App.css';
import Transcripter from './features/transcripter/Transcripter';

function App() {
  return (
    <div className="App">
      <header>
        <h1>Amazon Transcribe Streaming</h1>
        <h2>Demonstration Application</h2>
      </header>
      <section>
        <Transcripter></Transcripter>
      </section>
      <footer></footer>
    </div >
  );
}

export default App;
