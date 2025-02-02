import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CustomButton from '../components/CustomButton'
import CustomInput from '../components/CustomInput'
import './CreateRoomScreen.css'

type Dataset = {
  title: string
  thumbnail: string
  download_url: string
}

export default function CreateRoomScreen() {
  const [numQuestions, setNumQuestions] = useState(2);
  const [datasetQuery, setDatasetQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const navigate = useNavigate()

  const handleCreateRoom = async () => {
    if (!selectedDataset) return
    try {
      const response = await fetch('http://localhost:8000/start_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_url: selectedDataset.download_url,
          questions_num: numQuestions,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to start session')
      }
      const data = await response.json()
      navigate(`/game/${data.session_code}`)
    } catch (error) {
      console.error('Error starting session:', error)
    }
  }

  const handleSearchDatasets = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/datasets?query=${encodeURIComponent(datasetQuery)}`
      )
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      const results: Dataset[] = await response.json()
      setSearchResults(results)
      setModalOpen(true)
    } catch (error) {
      console.error('Error fetching datasets:', error)
    }
  }

  const handleDatasetSelect = (dataset: Dataset) => {
    setSelectedDataset(dataset)
    setModalOpen(false)
  }

  return (
    <div className="create-room-screen">
            <div className="decorative-container">
        <div className="decorative-shape shape-x" style={{ top: '10%', left: '15%' }}></div>
        <div className="decorative-shape shape-x" style={{ bottom: '25%', right: '30%' }}></div>
        <svg
          className="decorative-shape shape-triangle"
          style={{ top: '30%', right: '10%' }}
          viewBox="0 0 40 40"
        >
          <polygon points="20,5 35,35 5,35" fill="none" stroke="#3c3c3c" strokeWidth="2" />
        </svg>
        <svg
          className="decorative-shape shape-triangle"
          style={{ bottom: '40%', left: '20%' }}
          viewBox="0 0 40 40"
        >
          <polygon points="20,5 35,35 5,35" fill="none" stroke="#3c3c3c" strokeWidth="2" />
        </svg>
        <div className="decorative-shape shape-square" style={{ bottom: '20%', left: '5%' }}></div>
        <div className="decorative-shape shape-square" style={{ top: '50%', right: '25%' }}></div>
        <div className="decorative-shape shape-circle" style={{ bottom: '15%', right: '20%' }}></div>
        <div className="decorative-shape shape-circle" style={{ top: '20%', left: '50%' }}></div>
      </div>
      <h1 className="app-title">QuizzR</h1>
      <h2 className="create-room">Create a Room</h2>
      <div className="form-container">
        <div className="form-group">
          <label>Number of Questions: {numQuestions}</label>
          <input
            type="range"
            min="2"
            max="10"
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
          />
        </div>
        {selectedDataset ? (
          <div className="selected-dataset">
            <img src={selectedDataset.thumbnail} alt={selectedDataset.title} />
            <p>{selectedDataset.title}</p>
            <button onClick={() => setSelectedDataset(null)}>×</button>
          </div>
        ) : (
          <div className="search-container">
            <CustomInput
              placeholder="Search datasets..."
              value={datasetQuery}
              onChange={(e) => setDatasetQuery(e.target.value)}
            />
            <CustomButton onClick={handleSearchDatasets}>Search</CustomButton>
          </div>
        )}
        <div className="button-group">
          <CustomButton onClick={handleCreateRoom}>Create Room</CustomButton>
          <CustomButton onClick={() => window.history.back()}>Back</CustomButton>
        </div>
      </div>

      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Select a Dataset</h3>
            <div className="dataset-grid">
              {searchResults.map((dataset, index) => (
                <div key={index} className="dataset-card" onClick={() => handleDatasetSelect(dataset)}>
                  <img src={dataset.thumbnail} alt={dataset.title} />
                  <p>{dataset.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}