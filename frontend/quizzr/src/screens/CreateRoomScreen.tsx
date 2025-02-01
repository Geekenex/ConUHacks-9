import { useState } from 'react'
import CustomButton from '../components/CustomButton'
import CustomInput from '../components/CustomInput'
import './CreateRoomScreen.css'

type Dataset = {
  title: string
  thumbnail: string
  download_url: string
}

export default function CreateRoomScreen() {
  const [numPlayers, setNumPlayers] = useState(2)
  const [datasetQuery, setDatasetQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)

  const handleCreateRoom = () => {
    console.log('Creating room with up to', numPlayers, 'players')
    console.log('Selected dataset:', selectedDataset)
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
    <div className="section create-room-screen">
      <p className="app-create-title">QuizzR</p>
      <h2>Create a room</h2>
      <div className="form-buttons-container">
        <div className="form-section">
          <label>Number of questions: {numPlayers}</label>
          <input
            type="range"
            className="questions-slider"
            min="2"
            max="10"
            value={numPlayers}
            onChange={(e) => setNumPlayers(Number(e.target.value))}
          />

          {selectedDataset ? (
            <div className="selected-dataset">
              <div className="selected-dataset-card">
                <img
                  src={selectedDataset.thumbnail}
                  alt={selectedDataset.title}
                  className="dataset-thumbnail"
                />
                <p className="dataset-title">{selectedDataset.title}</p>
                <button
                  className="clear-dataset-btn"
                  onClick={() => setSelectedDataset(null)}
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <div className="dataset-search">
              <CustomInput
                placeholder="Enter dataset search query..."
                value={datasetQuery}
                onChange={(e) => setDatasetQuery(e.target.value)}
              />
              <CustomButton onClick={handleSearchDatasets}>
                Search Datasets
              </CustomButton>
            </div>
          )}
        </div>
        <div className="button-container">
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
                <div
                  key={index}
                  className="dataset-card"
                  onClick={() => handleDatasetSelect(dataset)}
                >
                  <img
                    src={dataset.thumbnail}
                    alt={dataset.title}
                    className="dataset-thumbnail"
                  />
                  <p className="dataset-title">{dataset.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
