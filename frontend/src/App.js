
import './App.css';

import { useState } from "react";

function App() {
  const [analysis, setAnalysis] = useState(null);

  const analyzeProduct = async () => {
    const response = await fetch(
      "http://localhost:4000/api/products/analyze"
    );

    const data = await response.json();

    setAnalysis(data);
  };

  return (
    <div>
      <h1>StyleAI</h1>

      <p>AI-powered fashion intelligence platform</p>

      <button onClick={analyzeProduct}>
        Analyze Product
      </button>

      {analysis && (
        <div>
          <h2>AI Analysis</h2>

          <p>
            Product: {analysis.aiAnalysis.product}
          </p>

          <p>
            Category: {analysis.aiAnalysis.category}
          </p>

          <p>
            Style: {analysis.aiAnalysis.style}
          </p>
        </div>
      )}
    </div>
  );
}


export default App;
