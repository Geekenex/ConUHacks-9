import { useState } from 'react'
import CustomButton from '../components/CustomButton'
import CustomInput from '../components/CustomInput'
import './CreateRoomScreen.css'

type Dataset = {
  title: string
  thumbnail: string
  download_url: string
}

const dummyDatasets: Dataset[] = [
  {
    title: "Netflix Movies and TV Shows",
    thumbnail:
      "https://storage.googleapis.com/kaggle-datasets-images/434238/824878/30c0ef57882454a0419a348088aa2306/dataset-card.jpg?t=2019-12-04-06-00-44",
    download_url:
      "https://www.kaggle.com/datasets/shivamb/netflix-shows/download/netflix_titles.csv",
  },
  {
    title: "Netflix Movies and TV Shows",
    thumbnail:
      "https://storage.googleapis.com/kaggle-datasets-images/4769773/8081202/818c41acd81442d98e99dc5badc12d76/dataset-card.jpg?t=2024-04-10-10-06-16",
    download_url:
      "https://www.kaggle.com/datasets/rahulvyasm/netflix-movies-and-tv-shows/download/netflix_titles.csv",
  },
  {
    title: "Netflix Movies and TV Shows",
    thumbnail:
      "https://storage.googleapis.com/kaggle-datasets-images/6417893/10362470/3d1aafbbfbf12c038cd9e5fa97f07d61/dataset-card.jpeg?t=2025-01-03-10-41-54",
    download_url:
      "https://www.kaggle.com/datasets/anandshaw2001/netflix-movies-and-tv-shows/download/netflix_titles.csv",
  },
  {
    title: "Netflix Movies and TV Shows",
    thumbnail:
      "https://storage.googleapis.com/kaggle-datasets-images/4538199/7760004/9679d193322ae994d4e6ed643f6a817e/dataset-card.jpeg?t=2024-03-04-15-50-50",
    download_url:
      "https://www.kaggle.com/datasets/arnavvvvv/netflix-movies-and-tv-shows/download/netflix_titles.csv",
  },
  {
    title: "Netflix Movies and TV Shows",
    thumbnail:
      "https://storage.googleapis.com/kaggle-datasets-images/6147571/9989172/8db7e861a9bd702df507ef8089291255/dataset-card.png?t=2024-11-23-08-10-53",
    download_url:
      "https://www.kaggle.com/datasets/zafarali27/netflix-movies-and-tv-shows/download/Netflix_Movies_and_TV_Shows.csv",
  },
  {
    title: "Latest Netflix TV shows and movies",
    thumbnail:
      "https://storage.googleapis.com/kaggle-datasets-images/2812514/4852010/9436b3a380293e2d520714545be94a87/dataset-card.jpg?t=2023-01-14-17-27-12",
    download_url:
      "https://www.kaggle.com/datasets/senapatirajesh/netflix-tv-shows-and-movies/download/NetFlix.csv",
  },
  {
    title: "Netflix Movies and Shows",
    thumbnail:
      "https://storage.googleapis.com/kaggle-datasets-images/4026921/7004629/4d30a09d38e6dfe3feaa31920a680108/dataset-card.jpg?t=2023-11-19-18-39-24",
    download_url:
      "https://www.kaggle.com/datasets/maso0dahmed/netflix-movies-and-shows/download/imdb_movies_shows.csv",
  },
  {
    title: "Netflix Movies and TV Shows 2021 ",
    thumbnail:
      "https://storage.googleapis.com/kaggle-datasets-images/1474883/2437311/73a72898a5265702b913ff227b8a0204/dataset-card.png?t=2021-07-18-11-18-08",
    download_url:
      "https://www.kaggle.com/datasets/satpreetmakhija/netflix-movies-and-tv-shows-2021/download/netflixData.csv",
  },
  {
    title: "Netflix Chronicles: Exploring Movies and TV Shows ",
    thumbnail:
      "https://storage.googleapis.com/kaggle-datasets-images/4807456/8133228/1c1d9ca8d681952f626eee1299c7636e/dataset-card.png?t=2024-04-16-07-41-34",
    download_url:
      "https://www.kaggle.com/datasets/nayanack/netflix/download/netflix.csv",
  },
]

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

  const handleSearchDatasets = () => {
    //TODO: replace w real backend api call
    const results = dummyDatasets.filter((ds) =>
      ds.title.toLowerCase().includes(datasetQuery.toLowerCase())
    )
    setSearchResults(results)
    setModalOpen(true)
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
